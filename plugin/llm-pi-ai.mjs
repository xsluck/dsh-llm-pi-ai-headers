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

// ── 注入逻辑 ─────────────────────────────────────────────────────────────────
// 每个 snapshot 只包一次；adapter 同样只包一次。WeakSet 让旧 snapshot 可被
// 垃圾回收，且官方重建 snapshot（配置变化）时会再次走到 wrap。
const WRAPPED_ADAPTERS = new WeakSet()
const WRAPPED_SNAPSHOTS = new WeakSet()

/**
 * 从官方 llm-pi-ai settings 的 providers.<route>.headers 里取大小写不敏感的
 * user-agent。官方适配器会把它过滤掉，我们在这里读回并补进最终请求头。
 */
function userAgentOf(settings, provider) {
  const section = settings.get(NS)
  const headers = section?.providers?.[provider]?.headers
  if (headers === undefined) return undefined
  for (const [headerName, value] of Object.entries(headers)) {
    if (headerName.toLowerCase() === 'user-agent') {
      return typeof value === 'string' && value.length > 0 ? value : undefined
    }
  }
  return undefined
}

function wrapSnapshot(snapshot, settings) {
  if (snapshot === undefined || snapshot.models === undefined) return
  if (WRAPPED_SNAPSHOTS.has(snapshot)) return
  WRAPPED_SNAPSHOTS.add(snapshot)

  const models = snapshot.models
  const originalStreamSimple = models.streamSimple.bind(models)
  models.streamSimple = (model, context, options) => {
    const ua = userAgentOf(settings, model?.provider)
    const injected = ua === undefined
      ? options
      : {
          ...(options ?? {}),
          // pi-ai 的 applyAuth 在 mergeHeaders(auth.headers, options.headers)
          // 之后执行 transformHeaders，因此这里能覆盖 attribution 的 user-agent。
          transformHeaders: async (headers) => ({
            ...(headers ?? {}),
            'user-agent': ua,
          }),
        }
    return originalStreamSimple(model, context, injected)
  }
}

function wrapAdapter(adapter, settings) {
  if (adapter === undefined || WRAPPED_ADAPTERS.has(adapter)) return
  WRAPPED_ADAPTERS.add(adapter)

  const originalCurrent = adapter.current.bind(adapter)
  adapter.current = () => {
    const snapshot = originalCurrent()
    wrapSnapshot(snapshot, settings)
    return snapshot
  }
  // 注册时可能已经解析过 snapshot（官方 current() 是惰性的，但也可能已生成）
  if (adapter.snapshot !== undefined) wrapSnapshot(adapter.snapshot, settings)
}

// ── 设置桥（供设置侧边栏「模型扩展」分节读写官方 llm-pi-ai 分节）──────────────
// 与旧版相同：loopback-only 的 describe/mutate 端点，让浏览器卡片读写官方
// `llm-pi-ai` settings namespace，无需打官方客户端 bundle 补丁。
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

export function apply(ctx) {
  const scan = () => {
    for (const registration of ctx.llm.adapters.values()) {
      if (registration?.adapter instanceof PiAiAdapter) {
        wrapAdapter(registration.adapter, ctx.settings)
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