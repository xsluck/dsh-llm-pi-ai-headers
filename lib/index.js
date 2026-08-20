/**
 * dsh-llm-pi-ai-headers — standard dsh plugin entry.
 *
 * The implementation lives in `plugin/llm-pi-ai.mjs` so the legacy
 * `node install.mjs` path can keep copying exactly the same self-contained
 * server file. This module is the package entry used by the standard
 * `dsh plugin` / pnpm installation.
 */
export * from '../plugin/llm-pi-ai.mjs'