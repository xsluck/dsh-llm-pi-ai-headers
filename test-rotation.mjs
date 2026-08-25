/**
 * 真实代码路径测试：加载生产 plugin/llm-pi-ai.mjs，构造 mock ctx，
 * 验证 keyPool round-robin 轮换、UA 补回、无 keyPool 退化、配置热更新。
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
      'plain-prov': {}, // 无 keyPool、无 UA
    },
  },
}
const settings = { get: (ns) => store[String(ns)] }

// ── fake PiAiAdapter ───────────────────────────────────────────
// 直接绕过 instanceof 检查:apply 内部用 `instanceof PiAiAdapter` 判断,
// 我们给 fake 的 prototype 链上挂真 PiAiAdapter.prototype。
const real = await import('@deepseek-ai/dsh-llm-pi-ai')
class FakeAdapter extends real.PiAiAdapter {
  constructor() { super({}) }
}
const captured = []
let mockMode = 'simple' // 'simple': 返回普通对象; 'stream': 返回异步迭代流(可抛错)
const snapshot = {
  models: {
    streamSimple: async (model, context, options) => {
      // 执行插件注入的 transformHeaders,模拟 pi-ai applyAuth 最后一层
      const base = { 'x-attribution': 'dsh', Authorization: 'Bearer ORIGINAL' }
      if (typeof options?.transformHeaders !== 'function') {
        captured.push({ provider: model.provider, headers: base, noHook: true })
        return { ok: true }
      }
      const final = await options.transformHeaders(base)
      captured.push({ provider: model.provider, headers: final })
      if (mockMode !== 'stream') return { ok: true }
      const which = final.Authorization
      return {
        [Symbol.asyncIterator]: async function* () {
          yield { ok: true }
          if (which === 'Bearer K2') {
            const err = new Error('invalid api key')
            err.code = 'INVALID_CREDENTIAL'
            throw err
          }
        },
      }
    },
  },
}
const adapter = new FakeAdapter()
adapter.current = () => snapshot

// ── mock ctx 并启动插件 ────────────────────────────────────────
const warns = []
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

// ── 断言 ──────────────────────────────────────────────────────
let pass = 0, fail = 0
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✅', name) }
  else { fail++; console.log('  ❌', name, detail ?? '') }
}

console.log('— 测试 1: keyPool round-robin 顺序 (K1→K2→K3→K1) —')
await send('test-prov'); await send('test-prov'); await send('test-prov'); await send('test-prov')
const auths = captured.filter((c) => c.provider === 'test-prov').map((c) => c.headers.Authorization)
check('轮换顺序正确', JSON.stringify(auths) === JSON.stringify(['Bearer K1', 'Bearer K2', 'Bearer K3', 'Bearer K1']), JSON.stringify(auths))
check('覆盖了原始 Authorization', auths.every((a) => a !== 'Bearer ORIGINAL'))
check('UA 已补回', captured[0].headers['user-agent'] === 'ua-test/1.0')
check('其他头保留', captured[0].headers['x-attribution'] === 'dsh')

console.log('— 测试 2: 无 keyPool 的 provider 零介入 —')
await send('plain-prov')
const plain = captured.find((c) => c.provider === 'plain-prov')
check('未注入 transformHeaders(直通)', plain?.noHook === true)

console.log('— 测试 3: 配置热更新 (改 keys 后 rotator 重建,从头轮询) —')
captured.length = 0
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['Bearer N1', 'Bearer N2']
await send('test-prov'); await send('test-prov'); await send('test-prov')
const auths2 = captured.map((c) => c.headers.Authorization)
check('新池从 N1 重新开始', JSON.stringify(auths2) === JSON.stringify(['Bearer N1', 'Bearer N2', 'Bearer N1']), JSON.stringify(auths2))

console.log('— 测试 4: 空/非法 keyPool 被忽略 —')
captured.length = 0
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['', '   ']
await send('test-prov')
const after = captured[0]
check('全空 keys → 不注入 Authorization(保留原值)', after.headers.Authorization === 'Bearer ORIGINAL' && after.headers['user-agent'] === 'ua-test/1.0')

console.log('— 测试 5: 失败记账与健康快照 (Key#2 返回 INVALID_CREDENTIAL) —')
// 恢复有效池;K2 模拟凭据失效(流迭代中抛错)
store['llm-pi-ai'].providers['test-prov'].keyPool.keys = ['Bearer K1', 'Bearer K2', 'Bearer K3']
mockMode = 'stream'
const { keyHealthSnapshot } = await import('./plugin/llm-pi-ai.mjs')
const drain = async (stream) => { try { for await (const c of stream) void c } catch { /* 记账在包装层完成 */ } }
await drain(await send('test-prov')) // K1 成功
await drain(await send('test-prov')) // K2 失败
await drain(await send('test-prov')) // K3 成功
const health = keyHealthSnapshot()['test-prov']
check('健康快照包含 3 个 Key', health.keys.length === 3)
check('K2 记 1 次失败且标记疑似失效', health.keys[1].failures === 1 && health.keys[1].suspect === true && health.keys[1].lastErrorCode === 'INVALID_CREDENTIAL')
check('K1/K3 无失败且未标记', health.keys[0].failures === 0 && health.keys[2].failures === 0)
check('Key 脱敏不含完整值', !JSON.stringify(health).includes('Bearer K2'))
check('告警日志已发出', warns.some((m) => m.includes('key #2') && m.includes('INVALID_CREDENTIAL')))

console.log('— 测试 6: 已配置未使用的池 → 合成零统计 —')
// 'plain-prov' 无池,给新路由 'idle-prov' 配池但不发请求
store['llm-pi-ai'].providers['idle-prov'] = { keyPool: { headerName: 'Authorization', keys: ['Bearer I1'] } }
const health6 = keyHealthSnapshot(store['llm-pi-ai'])
check('未使用的池出现在快照中且零调用', health6['idle-prov']?.keys?.[0]?.uses === 0 && health6['idle-prov'].keys[0].failures === 0)
check('无池路由不出现在快照中', health6['plain-prov'] === undefined)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
