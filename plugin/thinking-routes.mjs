/**
 * dsh-llm-pi-ai-headers — 思考强度（reasoning effort）host 路由。
 *
 * 三条 loopback-only 路由，供设置侧边栏「模型扩展」分节的思考强度块使用：
 *   POST /api/dsh-llm-pi-ai-headers/thinking/suggest   —— 按现有缓存算建议（不联网）
 *   POST /api/dsh-llm-pi-ai-headers/thinking/probe     —— 拉该 provider 的 /models 并缓存
 *   POST /api/dsh-llm-pi-ai-headers/thinking/catalog   —— 外部目录状态 / 刷新
 *
 * 设计要点：
 *   - **浏览器不发任意 URL**：路由名由客户端给出，真正的 baseURL / 凭据一律
 *     host 侧从 settings 与 credentials 解析，天然没有 SSRF 面。
 *   - **不主动联网**：suggest 只用缓存；probe 与 catalog 都由用户显式点击触发。
 *   - **外部目录落盘缓存 7 天**，离线或拉取失败自动降级到内置知识库。
 *
 * @module dsh-llm-pi-ai-headers/thinking-routes
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import {
  buildExternalIndex,
  buildSuggestion,
  capacitySuggestionFor,
  compatHintFor,
  describeEfforts,
  isSendableLadder,
} from './thinking.mjs'

/** 外部目录缓存有效期。 */
const CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** 单个外部目录的拉取超时。 */
const CATALOG_TIMEOUT_MS = 120_000
/** 探测 provider /models 的超时。 */
const PROBE_TIMEOUT_MS = 20_000
/** 缓存文件所在目录名。 */
const CACHE_DIRNAME = 'dsh-llm-pi-ai-headers'
const CACHE_FILENAME = 'thinking-catalog.json'

/** 三个公共目录。都是无需鉴权的公开端点。 */
const CATALOG_SOURCES = Object.freeze({
  openrouter: 'https://openrouter.ai/api/v1/models',
  modelsDev: 'https://models.dev/api.json',
  litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
})

/** dsh home 下的缓存路径（不依赖 dsh-home-paths，避免新增 peer 依赖）。 */
function cachePath() {
  const home = typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
  return join(home, CACHE_DIRNAME, CACHE_FILENAME)
}

/**
 * 解析凭据引用：优先走 credentials 服务，退化为同名环境变量。
 *
 * ⚠️ `ctx.credentials.resolve()` 是 **async**（返回 Promise）。早期版本按同步
 * 调用，于是 `resolved.value` 恒为 undefined，静默退化成"没凭据"——表现就是
 * 探测一律 HTTP 401（凭据明明存在）。这里必须 await。
 * @returns 凭据值，或 undefined
 */
async function resolveCredential(ctx, ref) {
  if (typeof ref !== 'string' || ref.length === 0) return undefined
  try {
    // `ctx.reflect.get` 是 cordis 的"无需 inject 也能读服务"入口，服务不存在
    // 时返回 undefined 而不是抛 "cannot get property without inject"。
    const service = typeof ctx?.reflect?.get === 'function'
      ? ctx.reflect.get('credentials')
      : typeof ctx?.get === 'function'
        ? ctx.get('credentials')
        : undefined
    const resolved = await service?.resolve?.(ref)
    if (resolved !== undefined && resolved !== null) {
      const value = typeof resolved === 'string' ? resolved : resolved.value
      if (typeof value === 'string' && value.length > 0) return value
    }
  } catch {
    // 服务缺失、引用非法或解析失败 → 落到环境变量
  }
  const fromEnv = process.env[ref]
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : undefined
}

/** 该 route 用来探测 /models 的凭据：主 Key 引用优先，其次 Key 池第一个。 */
async function probeCredential(ctx, profile) {
  const fromRef = await resolveCredential(ctx, profile?.apiKeyEnv)
  if (fromRef !== undefined) return fromRef
  const keys = profile?.keyPool?.keys
  if (Array.isArray(keys)) {
    for (const raw of keys) {
      const value = String(raw ?? '').replace(/^Bearer\s+/i, '').trim()
      if (value.length > 0) return value
    }
  }
  return undefined
}

/** 该 route 是否值得探测（OpenAI 兼容 + 有 baseURL）。 */
function probeTarget(profile) {
  const api = String(profile?.api ?? 'openai-completions')
  if (api !== 'openai-completions') return undefined
  const baseURL = profile?.baseURL
  if (typeof baseURL !== 'string' || baseURL.length === 0) return undefined
  let url
  try {
    url = new URL(baseURL)
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  return new URL('models', url.pathname.endsWith('/') ? url.href : url.href + '/').href
}

/**
 * 探测一个 provider 的 /models。
 * @returns { entries: Map<id, entry> } 或抛错
 */
async function probeModels(ctx, profile) {
  const url = probeTarget(profile)
  if (url === undefined) throw new Error('该提供商不支持 /models 探测（需要 openai-completions 协议与 baseURL）')
  const headers = {}
  for (const [key, value] of Object.entries(profile?.headers ?? {})) {
    if (typeof value === 'string') headers[key] = value
  }
  headers.accept = 'application/json'
  const credential = await probeCredential(ctx, profile)
  if (credential !== undefined) headers.authorization = `Bearer ${credential}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  let payload
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal })
    if (!response.ok) throw new Error(`/models 返回 HTTP ${response.status}`)
    payload = await response.json()
  } finally {
    clearTimeout(timer)
  }
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : undefined
  if (list === undefined) throw new Error('/models 响应里没有模型数组')
  const entries = new Map()
  for (const entry of list) {
    if (entry === null || typeof entry !== 'object') continue
    const id = typeof entry.id === 'string' ? entry.id : typeof entry.model === 'string' ? entry.model : undefined
    if (id === undefined) continue
    entries.set(id, entry)
  }
  return { entries, count: entries.size }
}

/** 带超时的 JSON 拉取。 */
async function fetchJson(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 构造思考强度路由。
 * @param options.ctx - host 上下文（用于凭据解析与日志）
 * @param options.settings - settings 服务
 * @param options.readSection - 读取 llm-pi-ai 分节现值
 * @param options.logger - 可选 logger
 */
export function makeThinkingRoutes(options) {
  const { ctx, settings, readSection, logger } = options

  // ── 状态：外部目录索引 + 逐 route 的探测缓存（都只活在进程内，
  //    外部目录额外落盘，重启后不用重新下载 9MB）──
  const state = {
    catalog: { fetchedAt: 0, index: new Map(), counts: {}, error: undefined, loaded: false, loading: undefined },
    probes: new Map(),
  }

  const readProviders = () => {
    const section = readSection(settings)
    const providers = section?.providers
    return providers !== null && typeof providers === 'object' ? providers : {}
  }

  const catalogStatus = () => ({
    fetchedAt: state.catalog.fetchedAt,
    stale: Date.now() - state.catalog.fetchedAt > CATALOG_TTL_MS,
    entries: state.catalog.index.size,
    counts: state.catalog.counts,
    sources: Object.keys(CATALOG_SOURCES),
    error: state.catalog.error,
    ttlDays: Math.round(CATALOG_TTL_MS / 86_400_000),
  })

  const applyCatalogs = (catalogs) => {
    state.catalog.index = buildExternalIndex(catalogs)
    state.catalog.counts = {
      openrouter: Array.isArray(catalogs?.openrouter?.data) ? catalogs.openrouter.data.length : 0,
      modelsDev: catalogs?.modelsDev !== null && typeof catalogs?.modelsDev === 'object' ? Object.keys(catalogs.modelsDev).length : 0,
      litellm: catalogs?.litellm !== null && typeof catalogs?.litellm === 'object' ? Object.keys(catalogs.litellm).length : 0,
    }
  }

  const loadCatalogFromDisk = () => {
    if (state.catalog.loaded) return
    state.catalog.loaded = true
    const path = cachePath()
    if (!existsSync(path)) return
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (parsed === null || typeof parsed !== 'object') return
      applyCatalogs(parsed.catalogs)
      state.catalog.fetchedAt = Number.isFinite(parsed.fetchedAt) ? parsed.fetchedAt : 0
      logger?.info?.(`llm-pi-ai-headers: 思考强度外部目录已从缓存载入（${state.catalog.index.size} 条）`)
    } catch (error) {
      state.catalog.error = error instanceof Error ? error.message : String(error)
    }
  }

  const saveCatalogToDisk = (catalogs, fetchedAt) => {
    const path = cachePath()
    try {
      mkdirSync(dirname(path), { recursive: true })
      const temp = `${path}.${process.pid}.tmp`
      writeFileSync(temp, JSON.stringify({ fetchedAt, catalogs }), 'utf8')
      renameSync(temp, path)
    } catch (error) {
      // 缓存写不进去只是"下次要重下"，不影响功能。
      try {
        unlinkSync(`${path}.${process.pid}.tmp`)
      } catch {
        // 忽略
      }
      logger?.warn?.(`llm-pi-ai-headers: 思考强度外部目录缓存写入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const refreshCatalog = async () => {
    if (state.catalog.loading !== undefined) return state.catalog.loading
    state.catalog.loading = (async () => {
      const entries = await Promise.all(
        Object.entries(CATALOG_SOURCES).map(async ([key, url]) => {
          try {
            return [key, await fetchJson(url, CATALOG_TIMEOUT_MS)]
          } catch (error) {
            return [key, undefined, error instanceof Error ? error.message : String(error)]
          }
        }),
      )
      const catalogs = {}
      const failures = []
      for (const [key, value, error] of entries) {
        if (value === undefined) failures.push(`${key}: ${error}`)
        else catalogs[key] = value
      }
      if (Object.keys(catalogs).length === 0) {
        state.catalog.error = failures.join('; ')
        return { ok: false, code: 'catalog-unavailable', message: state.catalog.error }
      }
      applyCatalogs(catalogs)
      state.catalog.fetchedAt = Date.now()
      state.catalog.error = failures.length > 0 ? failures.join('; ') : undefined
      saveCatalogToDisk(catalogs, state.catalog.fetchedAt)
      logger?.info?.(`llm-pi-ai-headers: 思考强度外部目录已更新（${state.catalog.index.size} 条）`)
      return { ok: true }
    })().finally(() => {
      state.catalog.loading = undefined
    })
    return state.catalog.loading
  }

  /** 组装某个 route 的逐模型建议。 */
  const suggestFor = (route) => {
    const providers = readProviders()
    const profile = providers[route]
    if (profile === null || typeof profile !== 'object') {
      return { ok: false, code: 'unknown-route', message: `提供商 "${route}" 不存在` }
    }
    const models = Array.isArray(profile.models) ? profile.models : []
    const probe = state.probes.get(route)
    const rows = []
    for (const model of models) {
      if (model === null || typeof model !== 'object') continue
      const id = typeof model.id === 'string' ? model.id : undefined
      if (id === undefined) continue
      const listingEntry = probe?.entries?.get(id)
      const suggestion = buildSuggestion({
        route: profile,
        model,
        listingEntry,
        externalIndex: state.catalog.index,
      })
      rows.push({
        id,
        name: typeof model.name === 'string' ? model.name : undefined,
        state: describeEfforts(model),
        compat: model.compat !== null && typeof model.compat === 'object' ? model.compat : undefined,
        // 文档里当前声明的容量/类型（UI 显示"当前值"用）
        declared: {
          contextWindow: typeof model.contextWindow === 'number' ? model.contextWindow : undefined,
          maxTokens: typeof model.maxTokens === 'number' ? model.maxTokens : undefined,
          input: Array.isArray(model.input) ? model.input : undefined,
        },
        // 容量/类型建议与档位建议分开算：两者可以来自不同层（例如网关只报
        // context_length，档位来自目录）。
        capacitySuggestion: capacitySuggestionFor(profile, model, state.catalog.index, listingEntry),
        // 即使没有梯子建议，也给出 compat 建议：用户手写档位时同样需要
        // thinkingFormat / supportsDeveloperRole 这两个"不补就会坏"的键。
        compatHint: compatHintFor(profile, model),
        suggestion: suggestion === undefined
          ? undefined
          : {
              efforts: suggestion.efforts,
              compat: suggestion.compat,
              capacities: suggestion.capacities,
              source: suggestion.source,
              confidence: suggestion.confidence,
              matched: suggestion.matched,
              note: suggestion.note,
              input: suggestion.input,
            },
      })
    }
    return {
      ok: true,
      value: {
        route,
        models: rows,
        probe: probe === undefined ? undefined : { at: probe.at, count: probe.count, error: probe.error },
        catalog: catalogStatus(),
      },
    }
  }

  const handlers = {
    async suggest(request) {
      const route = typeof request?.route === 'string' ? request.route : ''
      if (route.length === 0) return { ok: false, code: 'malformed', message: '缺少 route' }
      loadCatalogFromDisk()
      return suggestFor(route)
    },
    async probe(request) {
      const route = typeof request?.route === 'string' ? request.route : ''
      if (route.length === 0) return { ok: false, code: 'malformed', message: '缺少 route' }
      const providers = readProviders()
      const profile = providers[route]
      if (profile === null || typeof profile !== 'object') {
        return { ok: false, code: 'unknown-route', message: `提供商 "${route}" 不存在` }
      }
      try {
        const result = await probeModels(ctx, profile)
        state.probes.set(route, { at: Date.now(), entries: result.entries, count: result.count })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        state.probes.set(route, { at: Date.now(), entries: new Map(), count: 0, error: message })
        return { ok: false, code: 'probe-failed', message }
      }
      loadCatalogFromDisk()
      return suggestFor(route)
    },
    async catalog(request) {
      const action = typeof request?.action === 'string' ? request.action : 'status'
      if (action === 'refresh') {
        const result = await refreshCatalog()
        if (result.ok !== true) return result
      } else {
        loadCatalogFromDisk()
      }
      return { ok: true, value: catalogStatus() }
    },
  }

  return {
    handlers,
    /** 供 /describe 顺带返回目录状态，页面一打开就能显示"目录几天没更新"。 */
    catalogStatus: () => {
      loadCatalogFromDisk()
      return catalogStatus()
    },
    /** 校验一份待写入的梯子是否会被官方 schema 接受。 */
    validateLadder: (efforts) => isSendableLadder(efforts),
  }
}
