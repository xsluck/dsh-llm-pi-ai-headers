/**
 * llm-pi-ai (replacement): an OpenAI-compatible multi-provider LLM adapter
 * that takes over the official `llm-pi-ai` settings namespace.
 *
 * The official pi-ai adapter pins `user-agent` to dsh's own (attribution
 * reserved-word filtering) and cannot tunnel zen's free tier. This
 * replacement keeps the same settings shape (`llm-pi-ai.providers.<route>`)
 * so the Models page keeps working, but merges `profile.headers` verbatim —
 * the user can override User-Agent (or anything else) per provider. Only the
 * `openai-completions` wire protocol is supported.
 *
 * Routes are registered dynamically: one llm provider route per configured
 * provider key, matching the official behavior.
 */

import { randomUUID } from 'node:crypto'
import {
  CallId,
  LlmAdapter,
  LlmError,
  ReasoningEffortId,
  RetryPolicySchema,
  assertUsableApiKey,
  attributionHeaders,
  isContextWindowExceededError,
  isQuotaExceededError,
  CONTEXT_WINDOW_EXCEEDED_CODE,
  QUOTA_EXCEEDED_CODE,
} from '@deepseek-ai/dsh-llm'
import { deepEqualJson, installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { builtinProviders, getBuiltinModels } from '@earendil-works/pi-ai/providers/all'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import z from '@deepseek-ai/schemastery'

export const name = 'llm-pi-ai'
export const inject = ['llm']
const NS = settingsNamespace('llm-pi-ai')
const PROTOCOLS = ['openai-completions']
function supportedProtocols() {
  return PROTOCOLS
}
const OFF_REASONING_EFFORT = ReasoningEffortId('off')
const HIGH_REASONING_EFFORT = ReasoningEffortId('high')
const MAX_REASONING_EFFORT = ReasoningEffortId('max')
const REASONING_EFFORTS = [
  { id: OFF_REASONING_EFFORT, name: 'Off' },
  { id: HIGH_REASONING_EFFORT, name: 'High' },
  { id: MAX_REASONING_EFFORT, name: 'Max' },
]
const CATALOG = builtinProviders()
const CATALOG_IDS = new Set(CATALOG.map(provider => provider.id))
const DEFAULT_CONTEXT_WINDOW = 200000
const DEFAULT_MAX_TOKENS = 32768

const modelProfile = z.object({
  id: z.string().required(),
  name: z.string(),
  description: z.string(),
  contextWindow: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
})

const profile = z.object({
  apiKeyEnv: z.string().role('credential-ref'),
  displayName: z.string(),
  api: z.union(supportedProtocols()),
  baseURL: z.string(),
  models: z.array(modelProfile),
  headers: z.dict(z.string()),
  extraHeaders: z.dict(z.string()),
  defaultContextWindow: z.number().step(1).min(1),
  defaultMaxTokens: z.number().step(1).min(1),
  retryPolicy: RetryPolicySchema,
})

export const Config = z.object({
  providers: z.dict(profile).default({}),
})

function modelInfo(provider, model) {
  return {
    provider,
    id: model.id,
    name: model.name ?? model.id,
    ...model.description === undefined ? {} : { description: model.description },
    ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
    ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens },
    inputModalities: ['text'],
  }
}

function httpErrorCode(status, error) {
  if (status === 401 || status === 403) return 'AUTH'
  const detail = [error?.code, error?.type, error?.message].filter(Boolean).join(' ')
  if (isQuotaExceededError(detail)) return QUOTA_EXCEEDED_CODE
  if (status === 429) return 'RATE_LIMIT'
  if (status === 400) {
    if (isContextWindowExceededError(detail)) return CONTEXT_WINDOW_EXCEEDED_CODE
    return 'INVALID_REQUEST'
  }
  if (status >= 500) return 'SERVER'
  return `HTTP_${status}`
}

function serializeAssistant(message) {
  const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
  const reasoning = message.content.filter(b => b.type === 'reasoning').map(b => b.text).join('')
  const toolCalls = message.content.filter(b => b.type === 'tool-call').map(b => ({
    id: b.id,
    type: 'function',
    function: { name: b.name, arguments: b.arguments },
  }))
  return {
    role: 'assistant',
    content: text,
    ...reasoning.length > 0 ? { reasoning_content: reasoning } : {},
    ...toolCalls.length > 0 ? { tool_calls: toolCalls } : {},
  }
}

function serializeMessages(messages) {
  const wire = []
  for (const message of messages) {
    if (message.role === 'system') {
      wire.push({ role: 'system', content: message.content.filter(b => b.type === 'text').map(b => b.text).join('') })
      continue
    }
    if (message.role === 'assistant') {
      wire.push(serializeAssistant(message))
      continue
    }
    const toolResults = message.content.filter(b => b.type === 'tool-result')
    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
    if (text.length > 0 || toolResults.length === 0) wire.push({ role: 'user', content: text })
    for (const result of toolResults) {
      wire.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: result.content.filter(b => b.type === 'text').map(b => b.text).join('') || '(no output)',
      })
    }
  }
  return wire
}

function serializeRequest(options) {
  const messages = []
  if (options.system !== undefined) messages.push({ role: 'system', content: options.system })
  messages.push(...serializeMessages(options.messages))
  const tools = options.tools?.map(tool => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }))
  let reasoningEffort
  switch (options.reasoningEffort) {
    case HIGH_REASONING_EFFORT: reasoningEffort = 'high'; break
    case MAX_REASONING_EFFORT: reasoningEffort = 'max'; break
  }
  return {
    model: options.model,
    messages,
    stream: true,
    ...reasoningEffort !== undefined ? { reasoning_effort: reasoningEffort } : {},
    ...tools !== undefined && tools.length > 0 ? { tools } : {},
    ...options.temperature !== undefined ? { temperature: options.temperature } : {},
    ...options.maxTokens === undefined ? {} : { max_tokens: options.maxTokens },
    ...options.stop !== undefined ? { stop: options.stop } : {},
  }
}

async function* parseSse(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r/g, '')
      let idx
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const data = raw.split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart())
          .join('\n')
        if (data) yield data
        if (data === '[DONE]') return
      }
    }
  } finally {
    reader.releaseLock()
  }
  throw new LlmError('SSE stream ended without [DONE]', 'STREAM_CLOSED')
}

function closeBlock(block) {
  switch (block.kind) {
    case 'text': return { type: 'text', text: block.text }
    case 'reasoning': return { type: 'reasoning', text: block.text }
    case 'tool-call': return {
      type: 'tool-call',
      id: CallId(block.callId ?? ''),
      name: block.name ?? '',
      arguments: block.text,
    }
  }
}

function mapFinishReason(reason) {
  switch (reason) {
    case 'stop': return { kind: 'stop' }
    case 'tool_calls': return { kind: 'tool-calls' }
    case 'length': return { kind: 'max-tokens' }
    default: return {
      kind: 'error',
      failure: { message: `model stopped: ${reason}`, code: reason.toUpperCase() },
    }
  }
}

function mapUsage(usage) {
  const cacheRead = usage.prompt_tokens_details?.cached_tokens ?? usage.prompt_cache_hit_tokens
  return {
    inputTokens: usage.prompt_tokens - (cacheRead ?? 0),
    outputTokens: usage.completion_tokens,
    ...cacheRead !== undefined ? { cacheReadTokens: cacheRead } : {},
    ...usage.completion_tokens_details?.reasoning_tokens !== undefined
      ? { reasoningTokens: usage.completion_tokens_details.reasoning_tokens }
      : {},
  }
}

async function discoverModels(request, storedApiKey) {
  if (request.provider !== undefined) {
    const installed = getBuiltinModels(request.provider)
    if (installed.length > 0) {
      return installed.map(model => ({
        id: model.id,
        name: model.name,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
      }))
    }
  }
  if (request.baseURL === undefined || request.baseURL.length === 0) {
    throw new LlmError(
      `provider "${request.provider ?? ''}" has no baseURL; set a base URL or enter this provider's models by hand`,
      'DISCOVERY_FAILED',
    )
  }
  const api = request.api ?? 'openai-completions'
  if (!PROTOCOLS.includes(api)) {
    throw new LlmError(`pi-ai protocol "${api}" has no model listing this build can read; enter this provider's models by hand`, 'DISCOVERY_UNSUPPORTED')
  }
  const url = `${request.baseURL.replace(/\/+$/, '')}/models`
  const supplied = request.apiKey ?? await storedApiKey?.()
  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...supplied === undefined ? {} : { authorization: `Bearer ${supplied}` },
        ...attributionHeaders(),
      },
      ...request.signal === undefined ? {} : { signal: request.signal },
    })
  } catch (error) {
    if (request.signal?.aborted) throw new LlmError('model discovery aborted by caller', 'ABORTED', { cause: error })
    throw new LlmError(`could not reach ${url}`, 'DISCOVERY_FAILED', { cause: error })
  }
  if (!response.ok) {
    throw new LlmError(`${url} answered ${response.status}${response.status === 401 || response.status === 403 ? '; check the API key' : ''}`, 'DISCOVERY_FAILED')
  }
  let body
  try {
    body = await response.json()
  } catch {
    throw new LlmError(`${url} did not answer with JSON`, 'DISCOVERY_FAILED')
  }
  const data = body?.data
  if (!Array.isArray(data)) {
    throw new LlmError(`the endpoint's model listing has no "data" array; enter this provider's models by hand`, 'DISCOVERY_FAILED')
  }
  const models = []
  for (const raw of data) {
    const id = raw?.id
    if (typeof id !== 'string' || id.length === 0) continue
    const name = typeof raw?.name === 'string' ? raw.name
      : typeof raw?.display_name === 'string' ? raw.display_name
      : id.split('-').map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' ')
    const contextWindow = typeof raw?.context_window === 'number' ? raw.context_window : undefined
    const maxTokens = typeof raw?.max_output_tokens === 'number' ? raw.max_output_tokens : undefined
    models.push({
      id,
      ...name === undefined ? {} : { name },
      ...contextWindow === undefined ? {} : { contextWindow },
      ...maxTokens === undefined ? {} : { maxTokens },
    })
  }
  return models
}

async function* translate(payloads) {
  let nextIndex = 0
  let textBlock
  let reasoningBlock
  const toolBlocks = new Map()
  const order = []
  let pendingFinish
  let pendingUsage
  function open(kind) {
    const block = { index: nextIndex++, kind, text: '' }
    order.push(block)
    return block
  }
  for await (const payload of payloads) {
    if (payload === '[DONE]') {
      for (const block of order) yield { type: 'block-end', index: block.index, block: closeBlock(block) }
      if (pendingUsage) yield { type: 'usage', usage: pendingUsage }
      const reason = pendingFinish ?? { kind: 'stop' }
      yield {
        type: 'finish',
        reason: reason.kind === 'stop' && order.length === 0
          ? { kind: 'error', failure: { message: 'model returned a completed response with no content', code: 'EMPTY_RESPONSE' } }
          : reason,
      }
      return
    }
    let chunk
    try {
      chunk = JSON.parse(payload)
    } catch {
      throw new LlmError(`malformed SSE payload: ${payload.slice(0, 120)}`, 'MALFORMED_RESPONSE')
    }
    for (const choice of chunk.choices ?? []) {
      const delta = choice.delta
      const reasoning = delta?.reasoning_content
      if (typeof reasoning === 'string' && reasoning.length > 0) {
        if (!reasoningBlock) {
          reasoningBlock = open('reasoning')
          yield { type: 'block-start', index: reasoningBlock.index, blockType: 'reasoning' }
        }
        reasoningBlock.text += reasoning
        yield { type: 'reasoning-delta', index: reasoningBlock.index, text: reasoning }
      }
      const content = delta?.content
      if (typeof content === 'string' && content.length > 0) {
        if (!textBlock) {
          textBlock = open('text')
          yield { type: 'block-start', index: textBlock.index, blockType: 'text' }
        }
        textBlock.text += content
        yield { type: 'text-delta', index: textBlock.index, text: content }
      }
      for (const call of delta?.tool_calls ?? []) {
        let block = toolBlocks.get(call.index)
        if (!block) {
          block = open('tool-call')
          toolBlocks.set(call.index, block)
          yield { type: 'block-start', index: block.index, blockType: 'tool-call' }
        }
        if (call.id != null) block.callId = call.id
        else if (block.callId === undefined) block.callId = `call_${call.index}`
        if (call.function?.name != null) block.name = call.function.name
        const fragment = call.function?.arguments ?? ''
        block.text += fragment
        yield {
          type: 'tool-call-delta',
          index: block.index,
          id: CallId(block.callId ?? ''),
          ...block.name != null ? { name: block.name } : {},
          argumentsDelta: fragment,
        }
      }
      if (typeof choice.finish_reason === 'string') pendingFinish = mapFinishReason(choice.finish_reason)
    }
    if (chunk.usage) pendingUsage = mapUsage(chunk.usage)
  }
  throw new LlmError('SSE payload stream ended without [DONE]', 'STREAM_CLOSED')
}

class PiAiCompatAdapter extends LlmAdapter {
  constructor(config) {
    super()
    this.config = config
  }

  providerInfo(provider) {
    return { id: provider, name: this.config.profiles()[provider]?.displayName ?? provider }
  }

  providerRetryPolicy(provider) {
    return this.config.profiles()[provider]?.retryPolicy
  }

  listModels(provider) {
    const profile = this.config.profiles()[provider]
    return Promise.resolve((profile?.models ?? []).map(model => modelInfo(provider, model)))
  }

  resolveModel(provider, model) {
    const profile = this.config.profiles()[provider]
    if (profile === undefined) throw new LlmError(`no provider route "${provider}"`, 'NO_ADAPTER')
    const configured = profile.models?.find(entry => entry.id === model)
    return Promise.resolve({
      ...configured === undefined
        ? { provider, id: model, name: model, inputModalities: ['text'] }
        : modelInfo(provider, configured),
      context: { contextWindow: configured?.contextWindow ?? profile.defaultContextWindow ?? DEFAULT_CONTEXT_WINDOW },
      defaultMaxTokens: configured?.maxTokens ?? profile.defaultMaxTokens ?? DEFAULT_MAX_TOKENS,
      reasoning: {
        efforts: REASONING_EFFORTS,
        defaultEffort: HIGH_REASONING_EFFORT,
      },
    })
  }

  async *stream(options) {
    const profile = this.config.profiles()[options.provider]
    if (profile === undefined) throw new LlmError(`no provider route "${options.provider}"`, 'NO_ADAPTER')
    if (profile.baseURL === undefined) throw new LlmError(`provider "${options.provider}" has no baseURL`, 'INVALID_PROFILE')
    if (profile.api !== undefined && profile.api !== 'openai-completions') {
      throw new LlmError(`provider "${options.provider}" uses unsupported protocol "${profile.api}"`, 'UNSUPPORTED_PROTOCOL')
    }
    const apiKey = await this.config.resolveApiKey(options.provider, profile)
    const headers = {
      'content-type': 'application/json',
      'accept': 'text/event-stream',
      ...attributionHeaders(),
      ...apiKey !== undefined ? { authorization: `Bearer ${apiKey}` } : {},
      ...profile.headers ?? {},
      ...profile.extraHeaders ?? {},
    }
    const payload = JSON.stringify(serializeRequest(options))
    let response
    try {
      response = await fetch(`${profile.baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: payload,
        ...options.signal !== undefined ? { signal: options.signal } : {},
      })
    } catch (error) {
      if (options.signal?.aborted) throw new LlmError(`provider "${options.provider}" request aborted by caller`, 'ABORTED', { cause: error })
      throw new LlmError(`provider "${options.provider}" API request to ${profile.baseURL} failed`, 'TRANSPORT', { cause: error })
    }
    if (!response.ok) {
      let message = `provider "${options.provider}" API error (HTTP ${response.status})`
      let providerError
      try {
        providerError = (await response.json()).error
        if (providerError?.message) message = providerError.message
      } catch {
        // Swallow error-body parsing; the HTTP status still identifies the failure.
      }
      throw new LlmError(message, httpErrorCode(response.status, providerError), { status: response.status })
    }
    if (!response.body) throw new LlmError(`provider "${options.provider}" returned no response body`, 'EMPTY_RESPONSE')
    yield* translate(parseSse(response.body))
  }
}

export function apply(ctx, config) {
  let current = () => config
  const profiles = () => current().providers
  const resolveApiKey = async (provider, profile) => {
    const ref = profile.apiKeyEnv
    if (ref === undefined) return undefined
    const credentials = ctx.get('credentials')
    const hit = credentials !== undefined ? (await credentials.resolve(ref))?.value : launchEnvironmentOf(ctx).get(ref)?.value
    if (hit !== undefined && hit.length > 0) return assertUsableApiKey(hit, 'llm-pi-ai', ref)
    throw new LlmError(
      `no credential for provider route "${provider}"; its profile resolves ${ref}, which is not set — ` +
      `store ${ref} through the web Models page or export it as an environment variable`,
      'MISSING_CREDENTIAL',
    )
  }
  const adapter = new PiAiCompatAdapter({ profiles, resolveApiKey })
  const storedApiKey = async (provider) => {
    if (provider === undefined) return undefined
    const profile = profiles()[provider]
    if (profile === undefined) return undefined
    return resolveApiKey(provider, profile)
  }
  let registration
  let registeredFacts
  let directoryHandle
  const ensureDirectory = () => {
    const entries = new Map()
    for (const provider of CATALOG) {
      if (provider.auth?.apiKey === undefined) continue
      entries.set(provider.id, {
        provider: provider.id,
        displayName: provider.id,
        settingsNs: NS,
        settingsPath: ['providers', provider.id],
      })
    }
    for (const provider of Object.keys(profiles())) {
      entries.set(provider, {
        provider,
        displayName: profiles()[provider]?.displayName ?? provider,
        settingsNs: NS,
        settingsPath: ['providers', provider],
        declared: !CATALOG_IDS.has(provider),
      })
    }
    const list = [...entries.values()]
    if (list.length === 0) return
    if (directoryHandle === undefined) directoryHandle = ctx.llm.registerConfigurableProviders(list)
    else directoryHandle.replace(list)
  }
  const ensureRegistrationFacts = () => {
    const routes = Object.keys(profiles())
    const facts = routes.map(provider => ({
      provider,
      name: profiles()[provider]?.displayName,
    }))
    if (deepEqualJson(facts, registeredFacts)) return
    if (registration === undefined) {
      if (routes.length === 0) {
        registeredFacts = facts
        return
      }
      registration = ctx.llm.registerAdapter(routes, adapter)
    } else registration.replace(routes)
    registeredFacts = facts
  }
  ensureRegistrationFacts()
  ensureDirectory()
  ctx.llm.registerModelDiscovery(NS, (request) => discoverModels(request, () => storedApiKey(request.provider)))
  installSettingsSection(ctx, NS, Config, config, {
    setSource: (source) => {
      current = source
    },
    onChange: () => {
      try {
        ensureRegistrationFacts()
        ensureDirectory()
      } catch (error) {
        ctx.logger.error('llm-pi-ai: keeping the previously registered routes after a refused update')
        ctx.logger.error(error)
      }
    },
  })
  ctx.logger.info(`llm-pi-ai: serving ${Object.keys(profiles()).length} provider route(s)`)
}