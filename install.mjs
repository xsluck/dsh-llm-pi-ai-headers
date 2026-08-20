#!/usr/bin/env node
/**
 * dsh-llm-pi-ai-headers — installer
 *
 * Installs the replacement `llm-pi-ai` adapter plugin and patches the
 * Models-page client bundle so per-provider request headers can be edited
 * as key/value rows (fixes OpenCode Zen 429s by letting you set User-Agent).
 *
 * Usage:
 *   node install.mjs                     # auto-detect ~/.dsh and the dsh bundle
 *   node install.mjs --home <dir>        # explicit dsh data dir
 *   node install.mjs --dsh <root>        # explicit dsh install root (skip auto)
 *   node install.mjs --client <file>     # explicit client bundle path
 *   node install.mjs --skip-client       # server plugin only
 *   node install.mjs --client-only       # front-end patch only (for testing)
 *
 * The script is idempotent: re-running it after a dsh upgrade re-applies
 * the front-end patch to the fresh bundle (an original copy is kept at
 * <bundle>.dsh-zen.bak on first run).
 */
import { promises as fs } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
const PLUGIN_ID = 'llm-pi-ai-compat'
const PLUGIN_FILE = 'llm-pi-ai.mjs'
const NS_OFFICIAL = 'llm-pi-ai'

function fail(msg) {
  console.error(`\n[ERROR] ${msg}`)
  process.exit(1)
}

function log(step, msg) {
  console.log(`[${step}] ${msg}`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { home: HOME, client: undefined, dsh: undefined, skipClient: false, clientOnly: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--home') out.home = args[++i]
    else if (a === '--client') out.client = args[++i]
    else if (a === '--dsh') out.dsh = args[++i]
    else if (a === '--skip-client') out.skipClient = true
    else if (a === '--client-only') out.clientOnly = true
    else fail(`unknown argument: ${a}`)
  }
  return out
}

function fileUri(p) {
  return 'file:///' + path.resolve(p).replace(/\\/g, '/')
}

async function locateClientBundle(args) {
  if (args.client) {
    if (!(await fs.stat(args.client).catch(() => null))) fail(`client bundle not found: ${args.client}`)
    return path.resolve(args.client)
  }
  const candidates = []
  const pkg = path.join(args.home, 'profiles', 'node_modules', '@deepseek-ai', 'dsh-client-ui-settings-models', 'package.json')
  try {
    const real = await fs.realpath(pkg)
    candidates.push(path.join(path.dirname(real), 'lib', 'client.js'))
  } catch {}
  if (args.dsh) {
    candidates.push(path.join(args.dsh, 'node_modules', '@deepseek-ai', 'dsh-client-ui-settings-models', 'lib', 'client.js'))
  }
  const probe = path.join(args.home, 'profiles', 'node_modules', '@deepseek-ai', 'dsh-llm', 'package.json')
  try {
    const real = await fs.realpath(probe)
    // .../node_modules/@deepseek-ai/dsh-llm/package.json -> root of the dsh bundle
    const bundleRoot = path.join(path.dirname(real), '..', '..', '..')
    candidates.push(path.join(bundleRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-settings-models', 'lib', 'client.js'))
  } catch {}
  for (const c of candidates) {
    if (await fs.stat(c).catch(() => null)) return path.resolve(c)
  }
  fail('could not locate the dsh client bundle. Pass it explicitly with --client <path>\n' +
    '  (expected: .../node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js)')
}

async function readPatch(name) {
  const p = path.join(__dirname, 'patches', name)
  const t = await fs.readFile(p, 'utf8').catch(() => fail(`missing patch file: ${p}`))
  return t
}

async function patchClient(bundle) {
  log('client', `patching ${bundle}`)
  let src = await fs.readFile(bundle, 'utf8')

  if (src.includes('function HeadersListEditor')) {
    log('client', 'already patched (HeadersListEditor present) — nothing to do')
    return
  }

  const backup = bundle + '.dsh-zen.bak'
  if (!(await fs.stat(backup).catch(() => null))) {
    await fs.writeFile(backup, src)
    log('client', `original bundle saved to ${backup}`)
  }

  const def = await readPatch('headers-editor.js.txt')
  const editCall = await readPatch('edit-call.js.txt')
  const customCall = await readPatch('custom-call.js.txt')
  const enKeys = await readPatch('en-keys.txt')
  const zhKeys = await readPatch('zh-keys.txt')

  // --- pre-flight: verify every anchor against this bundle version --------
  const anchors = [
    ['en dict (fetchAdopt "Add selected")', 'fetchAdopt: "Add selected",\n'],
    ['zh dict (fetchAdopt "添加所选")', 'fetchAdopt: "添加所选",\n'],
    ['namespace constant', 'const NS$1 = "llm-pi-ai";'],
    ['custom-card state line', 'const [models, setModels] = (0, react.useState)([]);\n'],
    ['custom-card storesKey line', 'const storesKey = keyValue.length > 0;\n\t\t\t\tif (!committed) {'],
    ['custom-card profile models line', 'models: models.map((model) => ({ ...model }))\n\t\t\t\t\t};'],
    ['custom-card render anchor', 'disabled: profileDisabled\n\t\t\t\t\t}),\n\t\t\t\t\tfailure !== void 0'],
    ['edit-card models branch', 'family === "deepseek" ? (0, react_jsx_runtime.jsx)(DeepSeekModelsEditor,'],
    ['edit-card list close', 'probeBlocked: keyFailure,\n\t\t\t\t\t\t\t\tapi\n\t\t\t\t\t\t\t})\n\t\t\t\t\t\t]'],
  ]
  for (const [name, anchor] of anchors) {
    if (!src.includes(anchor)) fail(`front-end version mismatch: ${name} not found.\n` +
      'This patch targets the dsh release this plugin was built against; run `node install.mjs --skip-client` to install the server plugin only, or open an issue with your dsh version.')
  }

  // --- apply ---------------------------------------------------------------
  const before = src

  // 1. dictionary keys
  src = src.replace('fetchAdopt: "Add selected",\n', 'fetchAdopt: "Add selected",\n' + enKeys)
  src = src.replace('fetchAdopt: "添加所选",\n', 'fetchAdopt: "添加所选",\n' + zhKeys)

  // 2. HeadersListEditor component after the namespace constant
  src = src.replace('const NS$1 = "llm-pi-ai";', 'const NS$1 = "llm-pi-ai";\n\n\t\t' + def)

  // 3. custom-card: extraHeaders state
  src = src.replace('const [models, setModels] = (0, react.useState)([]);\n',
    'const [models, setModels] = (0, react.useState)([]);\n\t\t\tconst [extraHeaders, setExtraHeaders] = (0, react.useState)({});\n')

  // 4. custom-card: derive `extra` in createOnce
  src = src.replace('const storesKey = keyValue.length > 0;\n\t\t\t\tif (!committed) {',
    'const storesKey = keyValue.length > 0;\n\t\t\t\tconst extra = typeof extraHeaders === "object" && extraHeaders !== null && !Array.isArray(extraHeaders) && Object.keys(extraHeaders).length > 0 ? extraHeaders : void 0;\n\t\t\t\tif (!committed) {')

  // 5. custom-card: persist extraHeaders
  src = src.replace('models: models.map((model) => ({ ...model }))\n\t\t\t\t\t};',
    'models: models.map((model) => ({ ...model })),\n\t\t\t\t\t\t...extra === void 0 ? {} : { extraHeaders: extra }\n\t\t\t\t\t};')

  // 6. custom-card: render HeadersListEditor before the failure line
  src = src.replace('disabled: profileDisabled\n\t\t\t\t\t}),\n\t\t\t\t\tfailure !== void 0',
    'disabled: profileDisabled\n\t\t\t\t\t}),\n\t\t\t\t\t' + customCall + '\n\t\t\t\t\tfailure !== void 0')

  // 7. edit-card: insert HeadersListEditor after the models editor branch
  //    (dsh 0.1.0-rc.6 edit-card has no proxy/extraHeaders fields to replace)
  const anchor7 = 'probeBlocked: keyFailure,\n\t\t\t\t\t\t\t\tapi\n\t\t\t\t\t\t\t})\n\t\t\t\t\t\t]'
  const r7 = src.indexOf(anchor7)
  if (r7 < 0) {
    fail('front-end version mismatch: could not locate the edit-card models editor close. No changes were written.')
  }
  const insert7 = 'probeBlocked: keyFailure,\n\t\t\t\t\t\t\t\tapi\n\t\t\t\t\t\t\t}),\n\t\t\t\t\t\t\t'
  src = src.slice(0, r7) + insert7 + editCall + '\n\t\t\t\t\t\t]' + src.slice(r7 + anchor7.length)

  if (src === before) fail('no changes were applied — unexpected')
  if (src.includes('function HeadersListEditor') === false) fail('internal error: patch produced no component')

  // syntax check
  const check = spawnSync(process.execPath, ['--check', bundle], { input: src, encoding: 'utf8' })
  const checkOk = spawnSync(process.execPath, ['--check'], { input: src, encoding: 'utf8' })
  if (checkOk.status !== 0) {
    fail(`patched bundle failed syntax check:\n${checkOk.stderr}`)
  }

  await fs.writeFile(bundle, src)
  log('client', `patched ok (${before.length} -> ${src.length} bytes)`)
}

async function patchCordis(args) {
  if (args.clientOnly) return
  const srcDir = path.join(args.home, 'profiles', 'web', 'src')
  await fs.mkdir(srcDir, { recursive: true })
  const patchYml = path.join(args.home, 'profiles', 'web', 'cordis.patch.yml')

  // --- 1. server plugin file -------------------------------------------------
  const pluginSrc = path.join(__dirname, 'plugin', PLUGIN_FILE)
  const pluginDst = path.join(srcDir, PLUGIN_FILE)
  const existing = await fs.readFile(pluginDst, 'utf8').catch(() => null)
  if (existing === (await fs.readFile(pluginSrc, 'utf8'))) {
    log('server', `plugin up to date: ${pluginDst}`)
  } else {
    await fs.writeFile(pluginDst, await fs.readFile(pluginSrc))
    log('server', `plugin written: ${pluginDst}`)
  }

  // --- 2. cordis.patch.yml ---------------------------------------------------
  let yml = await fs.readFile(patchYml, 'utf8').catch(() => '')
  yml = yml.replace(/^\uFEFF/, '')
  // drop empty-list placeholders (`[]` on its own line) so appended items form a valid list
  yml = yml.replace(/(^|\r?\n)[ \t]*\[[ \t]*\][ \t]*(?=\r?\n|$)/g, '$1')
  yml = yml.replace(/\s+$/, '')
  const eol = yml.includes('\r\n') ? '\r\n' : '\n'
  const EOL = '\r?\n'
  const insertBlock =
    `${eol}- id: ${NS_OFFICIAL}${eol}  disabled: true${eol}${eol}- insert:${eol}    - id: ${PLUGIN_ID}${eol}      name: '${fileUri(pluginDst)}'${eol}`

  const hasOfficial = new RegExp(`(^|${EOL})- id: llm-pi-ai${EOL}`).test(yml)
  const hasOfficialDisabled = new RegExp(`(^|${EOL})- id: llm-pi-ai${EOL}(?:[ \\t][^\\r\\n]*${EOL})*?[ \\t]+disabled: true`).test(yml)
  const hasCompat = new RegExp(`(^|${EOL})- id: llm-pi-ai-compat${EOL}|(^|${EOL})- insert:${EOL}`).test(yml)

  if (!hasOfficial) {
    yml += insertBlock
    log('cordis', 'added llm-pi-ai disable + insert entries')
  } else {
    if (!hasOfficialDisabled) {
      yml = yml.replace(new RegExp(`(^|${EOL})- id: llm-pi-ai(${EOL})`), `$1- id: llm-pi-ai${eol}  disabled: true$2`)
      log('cordis', 'marked official llm-pi-ai disabled')
    }
    if (!hasCompat) {
      yml += `${eol}- insert:${eol}    - id: ${PLUGIN_ID}${eol}      name: '${fileUri(pluginDst)}'${eol}`
      log('cordis', 'added insert entry for the replacement plugin')
    } else if (yml.includes('- id: ' + PLUGIN_ID) && !yml.includes(fileUri(pluginDst))) {
      yml = yml.replace(new RegExp(`(${EOL}[ \\t]+name: )[^\\r\\n]*(${EOL})`), (_m, pre, e) => `${pre}'${fileUri(pluginDst)}'${e}`)
      log('cordis', 'updated insert entry path')
    } else if (!yml.includes('- id: ' + PLUGIN_ID)) {
      yml += `${eol}- insert:${eol}    - id: ${PLUGIN_ID}${eol}      name: '${fileUri(pluginDst)}'${eol}`
      log('cordis', 'added insert entry for the replacement plugin')
    }
  }
  await fs.writeFile(patchYml, yml)
  log('cordis', `cordis.patch.yml updated: ${patchYml}`)
}

async function main() {
  const args = parseArgs()
  console.log(`dsh-llm-pi-ai-headers installer\n  home: ${args.home}`)
  console.log('  NOTE: new installs should prefer the standard dsh plugin flow')
  console.log('  (dsh plugin --profile web add dsh-llm-pi-ai-headers) — it does not')
  console.log('  patch the official client bundle and survives dsh upgrades.')
  console.log('  This legacy installer is kept for existing patch-based setups.\n')

  if (!args.clientOnly) await patchCordis(args)
  if (!args.skipClient) {
    const bundle = await locateClientBundle(args)
    await patchClient(bundle)
  }

  console.log('\nDone. Restart the dsh web process to load the plugin and re-fetch the Models page (Ctrl+F5).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})