/**
 * 真实代码路径测试：加载生产 plugin/llm-pi-ai.mjs，构造 mock ctx，验证
 * keyPool round-robin 轮换、UA 补回、无 keyPool 退化、配置热更新、
 * 模型页主 Key 隐式入池、QUOTA 冷却与自动回池。
 */
import { apply } from './plugin/llm-pi-ai.mjs'

// ── mock settings ──────────────────────────────────────────────
const store = {
  'llm-pi-ai': {
    providers: {
      'test-prov': {
        headers: { 'User-Agent': 'ua-test/1.0' },
        keyPool: { headerName: 'Authorization', keys: ['Bearer K1', 'Bearer K2', 'Bearer K3'] },
      },
      'plain-prov': {}, // 无 keyPool、无 UA、无主 Key
    },
  },
}
const settings = { get: (ns) => store[String(ns)] }

// ── mock adapter ───────────────────────────────────────────────
// 不依赖 instanceof：插件按稳定适配器接口（current/stream/providerInfo）识别。
const captured = []
const warns = []

// 底层 mock 实现可切换。注意：绝不能重新赋值 snapshot.models.streamSimple ——
// 那会覆盖插件注入的包装层（此前测试 7 就因此测不到真实 path）。
let currentImpl = okStream()

const snapshot = {
  models: {
    // 模拟 pi-ai applyAuth 的最后一层：先跑插件注入的 transformHeaders，
    // 再交给底层实现。没注入钩子时记 noHook，用于证明零介入。
    streamSimple: async (model, context, options) => {
      const base = { 'x-attribution': 'dsh', Authorization: 'Bearer ORIGINAL' }
      if (typeof options?.transformHeaders !== 'function') {
        captured.push({ provider: model.provider, headers: base, noHook: true })
        return currentImpl(model, context, options)
      }
      const final = await options.transformHeaders(base)
      captured.push({ provider: model.provider, headers: final })
      return currentImpl(model, context, { ...options, finalHeaders: final })
    },
  },
}

const adapter = {
  current: () => snapshot,
  stream: () => { throw new Error('not used in these tests') },
  providerInfo: (provider) => ({ id: provider, name: provider }),
}

// ── mock ctx 并启动插件 ────────────────────────────────────────
const ctx = {
  llm: { adapters: new Map([['pi-ai', { adapter }]]) },
  settings,
  on: () => {},
  inject: () => {},
  logger: { info: () => {}, warn: (m) => warns.push(String(m)) },
}
apply(ctx)

const snap = adapter.current()
const send = (provider) => snap.models.streamSimple({ provider }, {}, undefined)
const drain = async (stream) => {
  try { for await (const c of stream) void c } catch { /* 记账在包装层完成 */ }
}

// ── mock 流工厂 ────────────────────────────────────────────────
function okStream() {
  return async () => ({
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'done', message: { content: [{ type: 'text', text: 'ok' }] } }
    },
  })
}
/** 服务端额度上限：pi-ai 以流内 error 事件下发（不是 throw）。 */
function quotaStream(resetTime) {
  return async () => ({
    [Symbol.asyncIterator]: async function* () {
      yield {
        type: 'error',
        error: {
          errorMessage: `429: {"code":"1310","message":"您已达到每周/每月使用上限，您的限额将在 ${resetTime} 重置。"}`,
        },
      }
    },
  })
}
/** 传输层/凭据失败：以抛错下发。 */
function throwStream(message, code) {
  return async () => ({
    [Symbol.asyncIterator]: async function* () {
      const err = new Error(message)
      err.code = code
      throw err
    },
  })
}

// ── 断言 ──────────────────────────────────────────────────────
let pass = 0, fail = 0
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✅', name) }
  else { fail++; console.log('  ❌', name, detail ?? '') }
}

console.log('— 测试 1: keyPool round-robin 顺序 (K1→K2→K3→K1) —')
currentImpl = okStream()
await drain(await send('test-prov'))
await drain(await send('test-prov'))
await drain(await send('test-prov'))
await drain(await send('test-prov'))
const auths = captured.filter((c) => c.provider === 'test-prov').map((c) => c.headers.Authorization)
check('轮换顺序正确', JSON.stringify(auths) === JSON.stringify(['Bearer K1', 'Bearer K2', 'Bearer K3', 'Bearer K1']), JSON.stringify(auths))
check('覆盖了原始 Authorization', auths.every((a) => a !== 'Bearer ORIGINAL'))
check('UA 已补回', captured[0].headers['user-agent'] === 'ua-test/1.0')
check('其他头保留', captured[0].headers['x-attribution'] === 'dsh')

console.log('— 测试 2: 无 keyPool / 无 UA / 无主 Key 的 provider 零介入 —')
await drain(await send('plain-prov'))
const plain = captured.find((c) => c.provider === 'plain-prov')
check('未注入 transformHeaders(直通)', plain?.noHook === true)

console.log('— 测试 3: 配置热更新 (改 keys 后 rotator 重建,从头轮询) —')
captured.length = 0
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['Bearer N1', 'Bearer N2']
await drain(await send('test-prov'))
await drain(await send('test-prov'))
await drain(await send('test-prov'))
const auths2 = captured.map((c) => c.headers.Authorization)
check('新池从 N1 重新开始', JSON.stringify(auths2) === JSON.stringify(['Bearer N1', 'Bearer N2', 'Bearer N1']), JSON.stringify(auths2))

console.log('— 测试 4: 空/非法 keyPool 被忽略（无主 Key 时不注入）—')
captured.length = 0
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['', '   ']
await drain(await send('test-prov'))
const after = captured[0]
check('全空 keys → 不注入 Authorization(保留原值)', after.headers.Authorization === 'Bearer ORIGINAL' && after.headers['user-agent'] === 'ua-test/1.0')

console.log('— 测试 5: 失败记账与健康快照 (Key#2 抛 INVALID_CREDENTIAL) —')
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['Bearer K1', 'Bearer K2', 'Bearer K3']
const { keyHealthSnapshot } = await import('./plugin/llm-pi-ai.mjs')
currentImpl = okStream()
await drain(await send('test-prov')) // K1 成功
currentImpl = throwStream('invalid api key', 'INVALID_CREDENTIAL')
await drain(await send('test-prov')) // K2 失败
currentImpl = okStream()
await drain(await send('test-prov')) // K3 成功
const health = keyHealthSnapshot()['test-prov']
check('健康快照包含 3 个 Key', health.keys.length === 3)
check('K2 记 1 次失败且标记疑似失效', health.keys[1].failures === 1 && health.keys[1].suspect === true && health.keys[1].lastErrorCode === 'INVALID_CREDENTIAL')
check('K1/K3 无失败且未标记', health.keys[0].failures === 0 && health.keys[2].failures === 0)
check('Key 脱敏不含完整值', !JSON.stringify(health).includes('Bearer K2'))
check('告警日志已发出', warns.some((m) => m.includes('key #2') && m.includes('INVALID_CREDENTIAL')))

console.log('— 测试 6: 已配置未使用的池 → 合成零统计 —')
store['llm-pi-ai'].providers['idle-prov'] = { keyPool: { headerName: 'Authorization', keys: ['Bearer I1'] } }
const health6 = keyHealthSnapshot(store['llm-pi-ai'])
check('未使用的池出现在快照中且零调用', health6['idle-prov']?.keys?.[0]?.uses === 0 && health6['idle-prov'].keys[0].failures === 0)
check('无池路由不出现在快照中', health6['plain-prov'] === undefined)

console.log('— 测试 7: 模型页主 Key 自动入池（扩展页无需重复粘贴）—')
captured.length = 0
// 只在模型页配了主 Key（apiKeyEnv），扩展页追加了一把 Key
store['llm-pi-ai'].providers = {
  appended: { apiKeyEnv: 'MY_PROVIDER_API_KEY', keyPool: { headerName: 'Authorization', keys: ['Bearer EXTRA'] } },
}
currentImpl = okStream()
await drain(await send('appended'))
await drain(await send('appended'))
await drain(await send('appended'))
const auths7 = captured.map((c) => c.headers.Authorization)
check('轮到主 Key 时不改写 Authorization(交给官方 auth 流程)', auths7[0] === 'Bearer ORIGINAL' && auths7[2] === 'Bearer ORIGINAL', JSON.stringify(auths7))
check('追加 Key 排在 2 号位', auths7[1] === 'Bearer EXTRA', JSON.stringify(auths7))
const health7 = keyHealthSnapshot()['appended']
check('健康视图标注主 Key', health7.keys[0].primary === true && health7.keys[1].primary === false, JSON.stringify(health7.keys.map((k) => k.primary)))
check('主 Key 只以标签出现,不外泄凭据引用名', !JSON.stringify(health7).includes('MY_PROVIDER_API_KEY'))

console.log('— 测试 8: 只有模型页主 Key（没在扩展页加过任何 Key）也已启用轮询 —')
captured.length = 0
store['llm-pi-ai'].providers = { solo: { apiKeyEnv: 'SOLO_API_KEY' } }
currentImpl = okStream()
await drain(await send('solo'))
check('轮询已启用(有 transformHeaders 钩子)', captured[0].noHook !== true)
check('主 Key 请求使用官方 Authorization 通路', captured[0].headers.Authorization === 'Bearer ORIGINAL')

console.log('— 测试 9: keyPool.enabled=false 显式关闭 —')
captured.length = 0
store['llm-pi-ai'].providers['solo'].keyPool = { enabled: false, keys: [] }
await drain(await send('solo'))
check('显式关闭后回到官方直通', captured[0].noHook === true)

console.log('— 测试 10: 流内 429 QUOTA 事件 → 冷却移出 → 到点自动回池 —')
captured.length = 0
warns.length = 0
store['llm-pi-ai'].providers = {
  'test-prov': { headers: { 'User-Agent': 'ua-test/1.0' }, keyPool: { headerName: 'Authorization', keys: ['Bearer Q1', 'Bearer Q2', 'Bearer Q3'] } },
}
currentImpl = quotaStream('2999-01-01 00:00:00')
await drain(await send('test-prov')) // Q1 → QUOTA，长期冷却
currentImpl = okStream()
await drain(await send('test-prov')) // 跳过 Q1 → Q2
await drain(await send('test-prov')) // Q3
await drain(await send('test-prov')) // Q1 仍冷却 → Q2
const auths10 = captured.map((c) => c.headers.Authorization)
check('Q1 被冷却,后续只轮换 Q2/Q3', JSON.stringify(auths10) === JSON.stringify(['Bearer Q1', 'Bearer Q2', 'Bearer Q3', 'Bearer Q2']), JSON.stringify(auths10))
const health10 = keyHealthSnapshot()['test-prov']
check('Q1 记为 QUOTA 且在冷却中', health10.keys[0].lastErrorCode === 'QUOTA' && health10.keys[0].cooling === true, JSON.stringify(health10.keys[0]))
check('冷却截止 = 消息里的重置时间', health10.keys[0].cooldownUntil === new Date('2999-01-01T00:00:00').toISOString(), String(health10.keys[0].cooldownUntil))
check('Q2/Q3 成功,无失败', health10.keys[1].failures === 0 && health10.keys[2].failures === 0)
check('QUOTA 告警已发出(含自动回池提示)', warns.some((m) => m.includes('key #1') && m.includes('QUOTA')), JSON.stringify(warns))

// 重置时间已过 → 立即可用（自动回池，无需人工干预）
captured.length = 0
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['Bearer R1', 'Bearer R2', 'Bearer R3', 'Bearer R4']
currentImpl = quotaStream('2000-01-01 00:00:00')
await drain(await send('test-prov')) // R1 QUOTA，但重置时间已过
currentImpl = okStream()
await drain(await send('test-prov')) // → R2
await drain(await send('test-prov')) // → R3
await drain(await send('test-prov')) // → R4
await drain(await send('test-prov')) // R1（已过期 → 自动回池）
const auths10b = captured.map((c) => c.headers.Authorization)
check('重置时间已过 → 自动回池继续参与轮询', auths10b[auths10b.length - 1] === 'Bearer R1', JSON.stringify(auths10b))
const health10b = keyHealthSnapshot()['test-prov']
check('过期 QUOTA 的 Key 不再标记冷却', health10b.keys[0].cooling === false, JSON.stringify(health10b.keys[0]))

console.log('— 测试 11: 成功自愈 → 成功请求清除冷却/疑似状态 —')
captured.length = 0
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['Bearer S1', 'Bearer S2']
currentImpl = quotaStream('2999-01-01 00:00:00')
await drain(await send('test-prov')) // S1 → 长期冷却
currentImpl = okStream()
await drain(await send('test-prov')) // 跳过 S1 → S2 成功
let h11 = keyHealthSnapshot()['test-prov']
check('S1 冷却中,S2 干净', h11.keys[0].cooling === true && h11.keys[1].cooling === false, JSON.stringify(h11.keys.map((k) => [k.index, k.cooling])))
await drain(await send('test-prov')) // S2 再次成功
h11 = keyHealthSnapshot()['test-prov']
check('成功路径不产生新失败/冷却', h11.keys[1].failures === 0 && h11.keys[1].cooling === false)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
