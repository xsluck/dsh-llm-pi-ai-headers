/**
 * dsh-llm-pi-ai-headers — 保留官方适配器的 User-Agent 注入器。
 *
 * 旧版插件会禁用并替换官方 `llm-pi-ai` 适配器，因此必须自己解析 SSE 流，
 * 也因此承担了参数截断 400、reasoning_content 回传等契约风险。
 *
 * 本版本改为 B 方案：官方 `llm-pi-ai` 适配器完全保留（流解析、reasoning
 * 回传、工具调用、上下文窗口判定等全部由官方 pi-ai 处理），本插件只做一件
 * 事——把官方适配器因 attribution 保留名过滤而丢掉的 `user-agent` 在请求
 * 最后一层补回去。
 *
 * 实现：官方适配器把 `user-agent` 当作保留头（`requestHeaders()` 过滤），
 * 但底层 pi-ai 库的 `applyAuth` 支持 `options.transformHeaders` 钩子，它在
 * 所有头合并完成之后执行。本插件等 `llm/adapters-updated` 事件拿到官方
 * `PiAiAdapter` 实例，wrap 其 `current()` 产生的每个 snapshot，给
 * `snapshot.models.streamSimple` 的 options 注入该钩子；UA 值来自官方
 * `llm-pi-ai.providers.<route>.headers['User-Agent']`（大小写不敏感），
 * 因此配置入口仍是官方 Models/设置页面，无需任何新配置项。
 */

import { SettingsConflictError, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'

export const name = 'llm-pi-ai-headers'
export const inject = ['llm', 'settings']

const NS = settingsNamespace('llm-pi-ai')

// ── Key Pool 轮询器 ──────────────────────────────────────────────────────────
// 每个 provider 维护一个轮询计数器与逐 Key 健康统计（调用数/失败数/最后错误），
// 供 bridge 健康报表与失败告警使用。
const ROTATORS = new Map()

// 记为「疑似 Key 失效」的错误码：凭据无效 / 配额耗尽 / 限流。
const KEY_SUSPECT_CODES = new Set(['INVALID_CREDENTIAL', 'QUOTA', 'RATE_LIMIT'])

// ── 配额耗尽（QUOTA）冷却 ────────────────────────────────────────────────────
// 服务端 429 里带「每周/每月使用上限 … 将在 <时间> 重置」这类消息时，该 Key
// 在重置时间前不会再成功。把它临时移出轮询（pick 跳过），到点自动回到池里。
// 无重置时间时按默认冷却期处理。
const QUOTA_MESSAGE_PATTERN = /quota|usage[\s_-]*limit|insufficient|exceeded|exhausted|使用上限|额度|配额|限额|余额/i
const RESET_TIME_PATTERN = /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/
const DEFAULT_QUOTA_COOLDOWN_MS = 60 * 60 * 1000

/** 从错误消息解析重置时间；解析失败返回 undefined。接受 '2026-09-09 21:15:14' 这类本地时间。 */
function parseResetAt(message) {
  const match = RESET_TIME_PATTERN.exec(String(message ?? ''))
  if (match === null) return undefined
  const t = Date.parse(match[1].replace(' ', 'T'))
  return Number.isFinite(t) ? t : undefined
}

/**
 * 哨兵：代表「官方模型页保存的主 Key」（凭据库里，settings 只有 apiKeyEnv 引用）。
 * 它永远不是密钥本身；轮到它时插件不覆盖认证头，pi-ai 的正常 auth 流程
 * 会用凭据库里的主 Key。健康视图里只以 masked 标签出现。
 */
const PRIMARY_MODELS_KEY = Symbol('primary-models-key')
const PRIMARY_MODELS_KEY_LABEL = '(模型页主 Key / Models primary key)'

/** 脱敏：保留头尾少量字符，中间打码；短值整体打码。 */
function maskKey(value) {
  if (value === PRIMARY_MODELS_KEY) return PRIMARY_MODELS_KEY_LABEL
  const s = String(value)
  if (s.length <= 8) return s.length === 0 ? '(empty)' : s.slice(0, 1) + '***'
  return s.slice(0, 6) + '…' + s.slice(-4)
}

/**
 * 从抛出的错误里提取 harness 错误码（dsh-llm 的共享 taxonomy）。
 * pi-ai 的流内 error 事件只有 errorMessage 没有 code，这里按
 * dsh-llm-pi-ai classifyPiAiError 的口径做消息级兜底分类（含中文配额文案）。
 */
function errorCodeOf(error) {
  const code = error?.code ?? error?.failure?.code
  if (typeof code === 'string' && code.length > 0) return code
  const message = String(error?.message ?? error?.errorMessage ?? error?.failure?.message ?? '')
  if (message.length === 0) return 'UNKNOWN'
  if (/\b429\b/.test(message) && QUOTA_MESSAGE_PATTERN.test(message)) return 'QUOTA'
  if (QUOTA_MESSAGE_PATTERN.test(message)) return 'QUOTA'
  if (/\b(?:401|403)\b/.test(message)) return 'AUTH'
  if (/\b429\b|rate.?limit/i.test(message)) return 'RATE_LIMIT'
  if (/\b5\d\d\b/.test(message)) return 'SERVER'
  if (/time(?:d)?\s*out|timeout/i.test(message)) return 'TIMEOUT'
  return 'UNKNOWN'
}

/** 该 Key 是否仍在冷却中（QUOTA 移出期）。 */
function isCooling(entry, now = Date.now()) {
  return entry.cooldownUntil !== undefined && entry.cooldownUntil > now
}

class KeyRotator {
  constructor(keys, headerName) {
    this.keys = keys
    this.headerName = headerName
    this.index = 0
    this.stats = keys.map(() => ({ uses: 0, failures: 0, lastErrorCode: undefined, lastFailedAt: undefined, cooldownUntil: undefined }))
  }
  /**
   * 轮询选取下一个可用 Key：跳过冷却中的（QUOTA 移出期）；全部都在冷却时，
   * 退回最早解冻的那个——请求照发（宁可打在快恢复的 Key 上，也不无声丢弃）。
   */
  pick() {
    const now = Date.now()
    let index = -1
    for (let offset = 0; offset < this.keys.length; offset += 1) {
      const candidate = (this.index + offset) % this.keys.length
      if (!isCooling(this.stats[candidate], now)) { index = candidate; break }
    }
    if (index === -1) {
      // 全部冷却：选 cooldownUntil 最早（最先恢复）的
      let earliest = Infinity
      for (let i = 0; i < this.keys.length; i += 1) {
        const until = this.stats[i].cooldownUntil ?? 0
        if (until < earliest) { earliest = until; index = i }
      }
    }
    this.index = (index + 1) % this.keys.length
    this.stats[index].uses += 1
    return { index, headerName: this.headerName, value: this.keys[index] }
  }
  /**
   * 记一次失败。QUOTA（含 429+中文上限文案）时进入冷却：有重置时间用重置
   * 时间，否则默认冷却期；到点 pick 自动把它塞回池里，无需人工干预。
   */
  recordFailure(index, code, message) {
    const entry = this.stats[index]
    if (entry === undefined) return
    entry.failures += 1
    entry.lastErrorCode = code
    entry.lastFailedAt = new Date().toISOString()
    if (code === 'QUOTA') {
      const resetAt = parseResetAt(message)
      // 重置时间已过（服务端时钟偏差/重试旧错误）→ 立即可用；无重置时间 → 默认冷却期
      entry.cooldownUntil = resetAt !== undefined ? resetAt : Date.now() + DEFAULT_QUOTA_COOLDOWN_MS
    }
  }
  /** 记一次成功：清除该 Key 的冷却与疑似状态（额度恢复或误判时自愈）。 */
  recordSuccess(index) {
    const entry = this.stats[index]
    if (entry === undefined) return
    if (entry.cooldownUntil !== undefined || entry.lastErrorCode !== undefined) {
      entry.cooldownUntil = undefined
      entry.lastErrorCode = undefined
    }
  }
  /** 脱敏健康视图（不外发完整 Key）。 */
  health() {
    const now = Date.now()
    return {
      headerName: this.headerName,
      keys: this.keys.map((value, index) => {
        const entry = this.stats[index]
        const cooling = isCooling(entry, now)
        return {
          index,
          masked: maskKey(value),
          primary: value === PRIMARY_MODELS_KEY,
          uses: entry.uses,
          failures: entry.failures,
          lastErrorCode: entry.lastErrorCode,
          lastFailedAt: entry.lastFailedAt,
          suspect: entry.lastErrorCode !== undefined && KEY_SUSPECT_CODES.has(entry.lastErrorCode),
          cooling,
          cooldownUntil: cooling ? new Date(entry.cooldownUntil).toISOString() : undefined,
        }
      }),
    }
  }
}

/**
 * 全量健康快照：{ provider: health }。有 rotator 的用真实统计；已配置
 * keyPool 但尚无请求的（懒加载还没建 rotator），合成零统计视图，让 UI
 * 配置完就能看到面板。不注册 ROTATORS，不影响轮询计数。
 */
export function keyHealthSnapshot(section) {
  const out = {}
  for (const [provider, rotator] of ROTATORS) out[provider] = rotator.health()
  const providers = section?.providers
  if (providers !== undefined && providers !== null) {
    for (const provider of Object.keys(providers)) {
      if (out[provider] !== undefined) continue
      const pool = keyPoolOf(section, provider)
      if (pool === undefined) continue
      out[provider] = new KeyRotator(pool.keys, pool.headerName).health()
    }
  }
  return out
}

/**
 * 从 provider 配置提取 { headerName, keys }；无可用池返回 undefined。
 *
 * 隐式池：官方「模型」页配好提供商（apiKeyEnv 指向凭据库）即视为已启用轮询，
 * 池子的 1 号位就是那把主 Key。主 Key 从不写进 settings.yaml —— 池里放的是
 * PRIMARY_MODELS_KEY 哨兵，轮到它时不覆盖认证头，由 pi-ai 正常 apiKey 流程
 * 使用凭据库里的主 Key。扩展页里手动加的 Key 依次排在后面。
 *
 * 显式关闭：UI 取消勾选会写 keyPool.enabled = false。
 */
function keyPoolOf(section, provider) {
  const profile = section?.providers?.[provider]
  const pool = profile?.keyPool
  if (pool !== undefined && pool !== null && pool.enabled === false) return undefined
  const headerName = typeof pool?.headerName === 'string' && pool.headerName.length > 0
    ? pool.headerName
    : 'Authorization'
  const configuredKeys = Array.isArray(pool?.keys) ? pool.keys : []
  const validKeys = [...new Set(configuredKeys.filter(k => typeof k === 'string' && k.trim().length > 0))]

  const hasPrimaryModelsKey = typeof profile?.apiKeyEnv === 'string' && profile.apiKeyEnv.length > 0
  if (!hasPrimaryModelsKey && validKeys.length === 0) return undefined
  return { headerName, keys: hasPrimaryModelsKey ? [PRIMARY_MODELS_KEY, ...validKeys] : validKeys }
}

/**
 * 获取或创建 provider 的 rotator（配置变化时自动重建）。
 */
function getRotator(section, provider) {
  const pool = keyPoolOf(section, provider)
  if (pool === undefined) { ROTATORS.delete(provider); return undefined }
  const existing = ROTATORS.get(provider)
  if (existing && existing.headerName === pool.headerName &&
      existing.keys.length === pool.keys.length &&
      existing.keys.every((k, i) => k === pool.keys[i])) {
    return existing
  }
  const rotator = new KeyRotator(pool.keys, pool.headerName)
  ROTATORS.set(provider, rotator)
  return rotator
}

// ── 注入逻辑 ─────────────────────────────────────────────────────────────────
// 每个 snapshot 只包一次；adapter 同样只包一次。WeakSet 让旧 snapshot 可被
// 垃圾回收，且官方重建 snapshot（配置变化）时会再次走到 wrap。
const WRAPPED_ADAPTERS = new WeakSet()
const WRAPPED_SNAPSHOTS = new WeakSet()

/**
 * 从官方 llm-pi-ai settings 的 providers.<route>.headers 里取大小写不敏感的
 * user-agent。官方适配器会把它过滤掉，我们在这里读回并补进最终请求头。
 */
function userAgentOf(section, provider) {
  const headers = section?.providers?.[provider]?.headers
  if (headers === undefined) return undefined
  for (const [headerName, value] of Object.entries(headers)) {
    if (headerName.toLowerCase() === 'user-agent') {
      return typeof value === 'string' && value.length > 0 ? value : undefined
    }
  }
  return undefined
}

/**
 * 把异步流包一层，两种失败都回调 onFailure：
 * 1) 迭代抛错（transport 层异常）；
 * 2) pi-ai 流内 error 事件（429/配额耗尽这类以事件而非异常下发的失败，
 *    形如 {type:'error', error:{errorMessage}}；这是 dsh-llm-pi-ai 错误的
 *    主下发通道，不看事件就会漏记全部额度类失败）。
 * 流正常 done（无 error 事件）时回调 onSuccess 清除冷却。
 * 兼容同步可迭代返回值与 Promise 包装的返回值；其余原样返回（防御接口变化）。
 */
function observeStream(result, onFailure, onSuccess) {
  const attach = (stream) => {
    if (stream === undefined || stream === null || stream[Symbol.asyncIterator] === undefined) return stream
    const iterator = stream[Symbol.asyncIterator]()
    let failed = false
    let done = false
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => iterator.next().then(
          (step) => {
            if (!step.done && step.value !== null && typeof step.value === 'object') {
              if (step.value.type === 'error') {
                failed = true
                onFailure({ message: step.value.error?.errorMessage ?? 'pi-ai stream error event' })
              } else if (step.value.type === 'done') {
                done = true
              }
            }
            if (step.done && !failed) onSuccess?.()
            return step
          },
          (error) => {
            failed = true
            onFailure(error)
            throw error
          },
        ),
        return: (value) => {
          if (!failed && !done) onSuccess?.()
          return typeof iterator.return === 'function' ? iterator.return(value) : Promise.resolve({ done: true, value })
        },
        throw: (error) => {
          if (!failed) { failed = true; onFailure(error) }
          return typeof iterator.throw === 'function' ? iterator.throw(error) : Promise.reject(error)
        },
      }),
    }
  }
  if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
    return result.then(attach)
  }
  return attach(result)
}

function wrapSnapshot(snapshot, settings, logger) {
  if (snapshot === undefined || snapshot.models === undefined) return
  if (WRAPPED_SNAPSHOTS.has(snapshot)) return
  WRAPPED_SNAPSHOTS.add(snapshot)

  const models = snapshot.models
  const originalStreamSimple = models.streamSimple.bind(models)
  models.streamSimple = (model, context, options) => {
    const provider = model?.provider
    // 每次请求只读一次 settings，UA 与 keyPool 共用同一份 section。
    const section = settings.get(NS)
    const ua = userAgentOf(section, provider)
    const rotator = getRotator(section, provider)
    const hasUA = ua !== undefined
    const hasKeyPool = rotator !== undefined
    if (!hasUA && !hasKeyPool) return originalStreamSimple(model, context, options)

    // Key 在调用时提前选定（而不是 transformHeaders 里），这样失败可归因到具体 Key。
    const picked = hasKeyPool ? rotator.pick() : undefined

    const injected = {
      ...(options ?? {}),
      transformHeaders: async (headers) => {
        const result = { ...(headers ?? {}) }
        // UA 补回（官方过滤了 user-agent，我们补进去）
        if (hasUA) result['user-agent'] = ua
        // Key Pool 轮询：注入本次调用预先选定的 Key。PRIMARY_MODELS_KEY
        // 代表官方 Models 页保存的 apiKeyEnv：不写入 headers，让 pi-ai
        // 的正常 apiKey/auth 流程使用该主 Key。
        if (picked !== undefined && picked.value !== PRIMARY_MODELS_KEY) {
          result[picked.headerName] = picked.value
        }
        return result
      },
    }
    const result = originalStreamSimple(model, context, injected)
    if (picked === undefined) return result
    return observeStream(
      result,
      (error) => {
        const code = errorCodeOf(error)
        const message = String(error?.message ?? error?.errorMessage ?? error?.failure?.message ?? '')
        rotator.recordFailure(picked.index, code, message)
        if (code === 'QUOTA') {
          const entry = rotator.stats[picked.index]
          const until = entry?.cooldownUntil !== undefined ? new Date(entry.cooldownUntil).toISOString() : 'cooldown expires'
          logger?.warn(
            `llm-pi-ai-headers: key #${picked.index + 1} (${maskKey(picked.value)}) on "${provider}" hit QUOTA — ` +
            `parked until ${until} and will rejoin the pool automatically`,
          )
        } else if (KEY_SUSPECT_CODES.has(code)) {
          logger?.warn(
            `llm-pi-ai-headers: key #${picked.index + 1} (${maskKey(picked.value)}) on "${provider}" ` +
            `failed with ${code} — check/replace this key in the key pool`,
          )
        }
      },
      () => rotator.recordSuccess(picked.index),
    )
  }
}

function wrapAdapter(adapter, settings, logger) {
  if (adapter === undefined || WRAPPED_ADAPTERS.has(adapter)) return
  WRAPPED_ADAPTERS.add(adapter)

  const originalCurrent = adapter.current.bind(adapter)
  adapter.current = () => {
    const snapshot = originalCurrent()
    wrapSnapshot(snapshot, settings, logger)
    return snapshot
  }
  // 注册时可能已经解析过 snapshot（官方 current() 是惰性的，但也可能已生成）
  if (adapter.snapshot !== undefined) wrapSnapshot(adapter.snapshot, settings, logger)
}

// ── 设置桥（供设置侧边栏「模型扩展」分节读写官方 llm-pi-ai 分节）──────────────
// 与旧版相同：loopback-only 的 describe/mutate 端点，让浏览器分节读写官方
// `llm-pi-ai` settings namespace（headers / retryPolicy），无需打官方客户端
// bundle 补丁。
const BRIDGE_PREFIX = '/api/dsh-llm-pi-ai-headers'
const MAX_JSON_BODY_BYTES = 128 * 1024

function isLoopbackRequest(request) {
  const address = request.socket?.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL('http://' + host)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function writeJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return undefined
  }
}

function toView(descriptor) {
  return {
    ns: String(descriptor.ns),
    schema: descriptor.schema,
    value: descriptor.value,
    ...descriptor.base === undefined ? {} : { base: descriptor.base },
    ...descriptor.user === undefined ? {} : { user: descriptor.user },
    ...descriptor.secrets === undefined
      ? {}
      : { secrets: descriptor.secrets.map(secret => ({ path: [...secret.path], set: secret.set })) },
    revision: descriptor.revision,
  }
}

function makeBridgeRoutes(settings) {
  const allowlisted = () =>
    settings.describe({ redactSecrets: true })
      .filter(descriptor => String(descriptor.ns) === String(NS))
      .map(descriptor => String(descriptor.ns))

  const handlers = {
    async describe() {
      const descriptors = settings.describe({ redactSecrets: true })
      return {
        ok: true,
        value: {
          namespaces: allowlisted()
            .map(ns => descriptors.find(descriptor => String(descriptor.ns) === ns))
            .filter(descriptor => descriptor !== undefined)
            .map(toView),
          writable: settings.writable !== false,
          keyHealth: keyHealthSnapshot(settings.get(NS)),
        },
      }
    },
    async mutate(request) {
      const body = request
      if (body === null || typeof body !== 'object' || typeof body.ns !== 'string' || !Array.isArray(body.ops)) {
        return { ok: false, code: 'settings-rejected', message: 'malformed bridge settings request' }
      }
      const { ns } = body
      if (!allowlisted().includes(ns)) {
        return { ok: false, code: 'settings-not-exposed', message: `settings namespace "${ns}" is not exposed` }
      }
      const expectedRevision = typeof body.expectedRevision === 'number' ? body.expectedRevision : undefined
      try {
        await settings.mutate(settingsNamespace(ns), body.ops, expectedRevision)
      } catch (error) {
        if (error instanceof SettingsConflictError) {
          return { ok: false, code: 'settings-conflict', message: error.message }
        }
        const message = error instanceof Error ? error.message : String(error)
        return { ok: false, code: 'internal', message }
      }
      const descriptor = settings.describe({ redactSecrets: true }).find(candidate => String(candidate.ns) === ns)
      if (descriptor === undefined) {
        return { ok: false, code: 'internal', message: `settings namespace "${ns}" was disposed after the mutate` }
      }
      return { ok: true, value: toView(descriptor) }
    },
  }

  const guard = (req, res) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: 'loopback requests only' })
      return false
    }
    if (req.method !== 'POST') {
      writeJson(res, 405, { error: 'method not allowed: ' + (req.method ?? '') })
      return false
    }
    return true
  }

  return [
    {
      kind: 'exact',
      path: `${BRIDGE_PREFIX}/describe`,
      handler: async (req, res) => {
        if (!guard(req, res)) return
        writeJson(res, 200, await handlers.describe())
      },
    },
    {
      kind: 'exact',
      path: `${BRIDGE_PREFIX}/mutate`,
      handler: async (req, res) => {
        if (!guard(req, res)) return
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { ok: false, code: 'settings-rejected', message: 'malformed JSON body' })
          return
        }
        writeJson(res, 200, await handlers.mutate(body))
      },
    },
  ]
}

// The plugin may be installed with a nested copy of dsh-llm-pi-ai (for example
// when the host is on a newer prerelease). In that case `instanceof PiAiAdapter`
// is false even though the host adapter is the correct implementation, and the
// old scan silently skipped it — making key rotation appear completely dead.
// Keep instanceof as the fast path, but also recognize the stable adapter seam.
function isPiAiAdapter(adapter) {
  return adapter instanceof PiAiAdapter || (
    adapter !== undefined && adapter !== null &&
    typeof adapter.current === 'function' &&
    typeof adapter.stream === 'function' &&
    typeof adapter.providerInfo === 'function'
  )
}

export function apply(ctx) {
  const scan = () => {
    for (const registration of ctx.llm.adapters.values()) {
      if (isPiAiAdapter(registration?.adapter)) {
        wrapAdapter(registration.adapter, ctx.settings, ctx.logger)
      }
    }
  }
  // 官方适配器可能先于本插件注册（scan 立即覆盖），也可能后注册
  // （llm/adapters-updated 事件覆盖）；两者都处理。
  scan()
  ctx.on('llm/adapters-updated', scan)

  // 标准客户端桥（设置侧边栏「模型扩展」分节）：读写官方 llm-pi-ai 分节的
  // headers 字段。additive，不打官方客户端 bundle 补丁。
  ctx.inject(['webServer', 'settings'], (sctx) => {
    sctx.effect(() => {
      const disposers = makeBridgeRoutes(sctx.settings).map(route => sctx.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'llm-pi-ai-headers: settings bridge')
  })

  ctx.logger.info('llm-pi-ai-headers: UA/header injector active (official llm-pi-ai adapter kept)')
}