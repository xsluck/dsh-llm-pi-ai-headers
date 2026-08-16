#!/usr/bin/env node
/**
 * dsh-llm-pi-ai-headers — uninstaller
 *
 * Reverts everything install.mjs touched:
 *   - restores the original client bundle from <bundle>.dsh-zen.bak
 *   - removes the insert entry and the `disabled: true` on the official
 *     llm-pi-ai entry in cordis.patch.yml (best-effort, text based)
 *   - deletes plugin/llm-pi-ai.mjs from the profile (with --purge)
 *
 * Usage:
 *   node uninstall.mjs --home <dir> [--client <file>] [--purge]
 */
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
const PLUGIN_ID = 'llm-pi-ai-compat'

function fail(msg) {
  console.error(`\n[ERROR] ${msg}`)
  process.exit(1)
}
function log(step, msg) {
  console.log(`[${step}] ${msg}`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { home: HOME, client: undefined, purge: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--home') out.home = args[++i]
    else if (a === '--client') out.client = args[++i]
    else if (a === '--purge') out.purge = true
    else fail(`unknown argument: ${a}`)
  }
  return out
}

async function restoreClient(args) {
  if (args.client) {
    const backup = args.client + '.dsh-zen.bak'
    if (await fs.stat(backup).catch(() => null)) {
      await fs.writeFile(args.client, await fs.readFile(backup))
      log('client', `restored ${args.client} from backup`)
    } else {
      log('client', 'no backup found — nothing to restore')
    }
    return
  }
  const base = path.join(args.home, 'profiles', 'node_modules', '@deepseek-ai', 'dsh-client-ui-settings-models')
  const pkg = path.join(base, 'package.json')
  try {
    const real = await fs.realpath(pkg)
    const client = path.join(path.dirname(real), 'lib', 'client.js')
    const backup = client + '.dsh-zen.bak'
    if (await fs.stat(backup).catch(() => null)) {
      await fs.writeFile(client, await fs.readFile(backup))
      log('client', `restored ${client} from backup`)
    } else {
      log('client', 'no backup found — nothing to restore')
    }
  } catch {
    log('client', 'could not locate the client bundle — pass --client <path> to restore it')
  }
}

async function revertCordis(args) {
  const patchYml = path.join(args.home, 'profiles', 'web', 'cordis.patch.yml')
  let yml = await fs.readFile(patchYml, 'utf8').catch(() => null)
  if (yml === null) {
    log('cordis', 'no cordis.patch.yml — nothing to do')
    return
  }
  const before = yml
  // remove insert entries that point at our plugin file
  yml = yml.replace(/^- insert:\n(?:[ \t][^\n]*\n)*?[ \t]+- id: llm-pi-ai-compat\n(?:[ \t][^\n]*\n)*?(?=^-|\n*$)/gm, '')
  // un-disable the official entry (drop the first `disabled: true` under - id: llm-pi-ai)
  yml = yml.replace(/(^|\n)- id: llm-pi-ai\n[ \t]+disabled: true\n/, '$1- id: llm-pi-ai\n')
  if (yml !== before) {
    await fs.writeFile(patchYml, yml)
    log('cordis', `reverted ${patchYml}`)
  } else {
    log('cordis', 'nothing to revert')
  }
}

async function purgePlugin(args) {
  if (!args.purge) return
  const pluginDst = path.join(args.home, 'profiles', 'web', 'src', 'llm-pi-ai.mjs')
  if (await fs.stat(pluginDst).catch(() => null)) {
    await fs.unlink(pluginDst)
    log('server', `removed ${pluginDst}`)
  }
}

async function main() {
  const args = parseArgs()
  console.log(`dsh-llm-pi-ai-headers uninstaller\n  home: ${args.home}`)
  await restoreClient(args)
  await revertCordis(args)
  await purgePlugin(args)
  console.log('\nDone. Restart the dsh web process to take effect.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})