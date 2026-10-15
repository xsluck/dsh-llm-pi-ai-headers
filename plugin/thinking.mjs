/**
 * dsh-llm-pi-ai-headers — 思考强度（reasoning effort）纯逻辑层。
 *
 * 本模块**只做数据判断**，不 import 任何 dsh / node / DOM API，因此：
 *   - host 半边（plugin/llm-pi-ai.mjs）用它算建议并落盘；
 *   - 单测（test-thinking.mjs）直接 import 它验证；
 *   - 浏览器半边不重复实现，统一走 host 的 /thinking/suggest 路由，
 *     保证"同一份输入永远得到同一份建议"。
 *
 * 三层识别来源，优先级：网关 /models 探测 > 外部目录 > 内置知识库。
 * 每一层都返回带 source/confidence 的建议，UI 据此标注，绝不静默当权威。
 *
 * @module dsh-llm-pi-ai-headers/thinking
 */

/** 官方 dsh-llm-pi-ai 认的推理档位全集（顺序即升级顺序）。 */
export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

/**
 * 档位 → 线上写法 的默认映射。
 * `off: null` 表示"不传该参数"——对多数端点即"不思考"，官方语义允许留空。
 */
export const DEFAULT_WIRE = Object.freeze({
  off: null,
  minimal: "minimal",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
  max: "max",
});

/** 内置知识库标注的置信度。 */
export const CONFIDENCE = Object.freeze({
  gateway: "high", // 你自己网关的 /models 明说了
  external: "medium", // 公共目录（OpenRouter / models.dev / LiteLLM）匹配
  knowledge: "low", // 内置名字表匹配
});

// ────────────────────────────────────────────────────────────────────────────
// 内置知识库：名字 → 档位梯子 + 线上方言
//
// 只收录"名字能确定档位"的家族；判不准的一律不写（宁可不建议，也不写错）。
// 中转/自建网关常把 id 改写（hy4-preview-f / k3 / gpt-5.6-luna），
// 因此 patterns 同时匹配 id 与显示名，按最长命中优先。
// ────────────────────────────────────────────────────────────────────────────
const KB = [
  {
    id: "deepseek-v4-vision",
    patterns: ["deepseek-v4-flash-vision", "deepseek-v4-vision", "vision-exp"],
    efforts: { off: "none", low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    contextWindow: 1048576,
    maxTokens: 384000,
    input: ["text", "image"],
  },
  {
    id: "deepseek-v4.1-flash",
    patterns: ["deepseek-v4.1-flash", "deepseek-v4.1", "deepseek-flash"],
    efforts: { off: "none", low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    contextWindow: 1048576,
    maxTokens: 384000,
    input: ["text", "image"],
  },
  {
    id: "deepseek-v4",
    patterns: ["deepseek-v4", "deepseek-v3.2", "deepseek-reasoner"],
    efforts: { off: "none", low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    contextWindow: 1048576,
    maxTokens: 65536,
    input: ["text"],
  },
  {
    id: "glm-5.3",
    patterns: ["glm-5.3", "glm-5-3", "glm-5.3-flash"],
    efforts: { low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 131072,
    input: ["text"],
  },
  {
    id: "glm-5.2",
    patterns: ["glm-5.2", "glm-5-2"],
    efforts: { off: "none", minimal: "minimal", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 131072,
    input: ["text"],
  },
  {
    id: "glm-4.6v",
    patterns: ["glm-4.6v", "glm-4-6v", "glm-4v", "glm-5v"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    contextWindow: 128000,
    maxTokens: 32768,
    input: ["text", "image"],
  },
  {
    id: "glm-generic",
    patterns: ["glm-5-turbo", "glm-5", "chatglm"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    contextWindow: 200000,
    maxTokens: 131072,
    input: ["text"],
  },
  {
    id: "qwen3.8",
    patterns: ["qwen3.8", "qwen-3.8", "qwen3-8"],
    efforts: { off: null, low: "low", medium: "medium", xhigh: "xhigh" },
    compat: { thinkingFormat: "qwen", supportsReasoningEffort: true },
    contextWindow: 262144,
    maxTokens: 65536,
    input: ["text"],
  },
  {
    id: "qwen3.8-flash-next",
    patterns: ["qwen3.8-flash-next", "qwen3.8-flash", "qwen-local"],
    efforts: { off: null, low: "low", medium: "medium", xhigh: "xhigh" },
    compat: { thinkingFormat: "qwen", supportsReasoningEffort: true },
    contextWindow: 262144,
    maxTokens: 65536,
    input: ["text"],
  },
  {
    id: "kimi-k3",
    // 裸 `k3` / `k3-256k` 是中转改写过的 Kimi K3，公共目录里查不到，
    // 但名字能确定家族——单独收一条，正好补上外部目录的盲区。
    patterns: ["kimi-k3", "kimi-for-coding", "moonshot-v1", "k3-256k", "k3"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    contextWindow: 1048576,
    maxTokens: 131072,
    input: ["text"],
  },
  {
    id: "kimi",
    patterns: ["kimi", "moonshot"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    contextWindow: 262144,
    maxTokens: 131072,
    input: ["text"],
  },
  {
    id: "minimax-m3",
    patterns: ["minimax-m3"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 131072,
    input: ["text", "image"],
  },
  {
    id: "hunyuan-hy4",
    patterns: ["hy4-preview", "hy-4-preview", "hy4"],
    efforts: { off: "no_think", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 64000,
    input: ["text"],
  },
  {
    id: "hunyuan-hy3",
    patterns: ["hy3", "hunyuan"],
    efforts: { low: "low", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 192000,
    maxTokens: 64000,
    input: ["text"],
  },
  {
    id: "openai-gpt-6",
    patterns: ["gpt-6"],
    efforts: { low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 128000,
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5.6",
    patterns: ["gpt-5.6"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 128000,
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5.5",
    patterns: ["gpt-5.5"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 400000,
    maxTokens: 128000,
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5.4",
    patterns: ["gpt-5.4"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 400000,
    maxTokens: 128000,
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5",
    patterns: ["gpt-5.3", "gpt-5.2", "gpt-5.1", "gpt-5"],
    efforts: { off: "none", minimal: "minimal", low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 400000,
    maxTokens: 128000,
    input: ["text"],
  },
  {
    id: "google-gemini",
    patterns: ["gemini"],
    efforts: { low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 65536,
    input: ["text", "image"],
  },
  {
    id: "mimo-v2.6",
    patterns: ["mimo-v2.6", "mimo-v2-6"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 1048576,
    maxTokens: 65536,
    input: ["text", "image"],
  },
  {
    id: "grok",
    patterns: ["grok"],
    efforts: { off: "none", low: "low", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 1000000,
    maxTokens: 65536,
    input: ["text"],
  },
  {
    id: "claude",
    patterns: ["claude"],
    efforts: { off: null, low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    contextWindow: 200000,
    maxTokens: 64000,
    input: ["text", "image"],
  },
];

/**
 * 家族提示：即使梯子来自外部目录，**方言与 off 的写法**仍应取自知识库。
 *
 * 原因：外部目录只描述"这个模型支持哪些档位"，不知道你网关的线上方言。
 * 而 `off` 是否要显式发一个值，取决于模型是不是"不明确关闭就会思考"：
 *   - deepseek / gpt-5 系默认思考，off 必须给值（或配合 thinkingFormat: deepseek）；
 *   - 其他模型 off 留空（=不传参数）才是正确语义。
 * @returns { thinkingFormat?, off?, input? } 或 undefined
 */
function familyHint(model) {
  const entry = matchKnowledge(model);
  if (entry === undefined) return undefined;
  return {
    thinkingFormat: entry.compat?.thinkingFormat,
    off: Object.hasOwn(entry.efforts, "off") ? entry.efforts.off : undefined,
    input: entry.input,
  };
}

/** 把家族提示的 off 写法包成 ladderFromLevels 的 wireOverrides。 */
function offOverride(hint) {
  if (hint === undefined || hint.off === undefined) return undefined;
  return { off: hint.off };
}

// ────────────────────────────────────────────────────────────────────────────
// 工具
// ────────────────────────────────────────────────────────────────────────────

/**
 * 宽松归一：小写、去掉厂商前缀，并把所有分隔符（`-` `.` `_` `/`）归一为空格。
 *
 * 保留空格而不是全部删掉，是为了让"词边界"仍然可判：
 * `gpt-5.6-luna` 与 `gpt-5.6` 必须能匹配（边界在空格处），
 * 而 `gpt-5` 不应把 `gpt-5.6` 抢走（最长命中兜底）。
 */
export function normalizeId(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^[^/]*\//, "") // 去掉 openrouter 式 `vendor/` 前缀
    .replace(/^\/?models\//, "") // 去掉 vLLM 式 `/models/` 前缀
    .replace(/[^a-z0-9]+/g, " ") // 分隔符归一为空格，保留词边界
    .trim();
}

/** 该位置是否是词边界（前后不是字母数字）。 */
function onBoundary(haystack, at, length) {
  const before = at === 0 ? "" : haystack[at - 1];
  const after = at + length >= haystack.length ? "" : haystack[at + length];
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

/** 最长词边界命中。 */
function longestHit(haystack, patterns) {
  let best;
  for (const pattern of patterns) {
    const needle = normalizeId(pattern);
    if (needle.length === 0) continue;
    let at = haystack.indexOf(needle);
    while (at >= 0) {
      if (onBoundary(haystack, at, needle.length)) {
        if (best === undefined || needle.length > best.length) best = { pattern, length: needle.length };
        break;
      }
      at = haystack.indexOf(needle, at + 1);
    }
  }
  return best?.pattern;
}

/** 模型的自述文本（id + 显示名），知识库与外部目录都在它上面匹配。 */
function haystackOf(model) {
  return normalizeId(model?.id) + " " + normalizeId(model?.name ?? model?.displayName ?? "");
}

/** 内置知识库匹配。 */
export function matchKnowledge(model) {
  const haystack = haystackOf(model);
  let best;
  for (const entry of KB) {
    const hit = longestHit(haystack, entry.patterns);
    if (hit === undefined) continue;
    const length = normalizeId(hit).length;
    if (best === undefined || length > best.length) best = { entry, length };
  }
  return best?.entry;
}

// ────────────────────────────────────────────────────────────────────────────
// compat 推断
// ────────────────────────────────────────────────────────────────────────────

/** 官方端点域名——这些域名 pi-ai 自己认得，无需我们钉 developer 角色。 */
const OFFICIAL_DOMAINS = [
  "api.deepseek.com",
  "deepseek.com",
  "api.openai.com",
  "openai.com",
  "api.anthropic.com",
  "anthropic.com",
  "generativelanguage.googleapis.com",
  "googleapis.com",
  "api.z.ai",
  "open.bigmodel.cn",
  "api.moonshot.cn",
  "api.moonshot.ai",
  "api.minimaxi.com",
  "api.minimax.chat",
  "api.x.ai",
  "opencode.ai",
  "openrouter.ai",
  "api.together.xyz",
  "api.together.ai",
  "chutes.ai",
  "api.ant-ling.com",
  "cloudflare.com",
];

/**
 * 是否"自建/中转网关"：openai-completions + 有 baseURL + 域名不在官方名单里。
 * 这类端点 pi-ai 会判定 supportsDeveloperRole=true，而模型一旦声明了
 * reasoningEfforts（reasoning=true），系统提示词的 role 就会从 system 变
 * developer，多数自建网关直接 400——所以必须钉回 system。
 */
/** baseURL 是否指向 pi-ai 内置目录不认识的自建/中转端点。 */
function isSelfHostedEndpointUrl(baseURL) {
  let host;
  try {
    host = new URL(baseURL).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host.includes(".")) return false;
  return !OFFICIAL_DOMAINS.some((root) => host === root || host.endsWith("." + root));
}

/**
 * pi-ai 内置目录里，**每个 provider 各自只说一种协议**的名字 → 协议。
 *
 * 来源：`@earendil-works/pi-ai/dist/providers/data/*.json`（每个文件顶层就是
 * 协议名）。官方解析协议的顺序是
 *   api = request.api ?? base?.api ?? routeApi
 *   routeApi = sharedCatalogApi(defaults)  // 该路由目录里所有模型的 api 去重
 * 所以 route 名一旦命中内置目录，**即使 api 没写也完全能判定**——这正是
 * `dpseek`（openai-completions）和 `kimi-coding`（anthropic-messages）的差别
 * 所在。多协议的路由（opencode 有 4 种）去重后是 undefined，必须显式声明，
 * 这种才真的判不出来。
 *
 * 只收"整个 provider 只有一种 api"的名字；多协议的一律不收，避免猜错。
 */
const BUILTIN_ROUTE_PROTOCOLS = Object.freeze({
  "amazon-bedrock": "anthropic-messages",
  anthropic: "anthropic-messages",
  "ant-ling": "anthropic-messages",
  "azure-openai-responses": "openai-responses",
  baseten: "openai-completions",
  cerebras: "openai-completions",
  chutes: "openai-completions",
  deepseek: "openai-completions",
  "github-copilot": undefined,
  "google-vertex": "google-generative-ai",
  google: "google-generative-ai",
  groq: "openai-completions",
  huggingface: "openai-completions",
  "kimi-coding": "anthropic-messages",
  meta: "openai-completions",
  minimax: "anthropic-messages",
  "minimax-cn": "anthropic-messages",
  mistral: "openai-completions",
  "moonshotai-cn": "openai-completions",
  moonshotai: "openai-completions",
  nvidia: "openai-completions",
  openai: "openai-responses",
  openrouter: undefined,
  "opencode-go": undefined,
  opencode: undefined,
  together: "openai-completions",
  xai: "openai-completions",
  zai: "openai-completions",
  "zai-coding-cn": "openai-completions",
  "cloudflare-ai-gateway": undefined,
  "cloudflare-workers-ai": "openai-completions",
  fireworks: undefined,
});

/**
 * 解析该 route 实际生效的线上协议。顺序与官方一致：
 *
 *   1. 路由自己声明的 `api` —— 最权威；
 *   2. **route 名命中 pi-ai 内置目录且该 provider 只有一种协议** —— 这也是
 *      官方 `base?.api ?? routeApi` 的实际结果（如 `deepseek` →
 *      openai-completions、`kimi-coding` → anthropic-messages）；
 *   3. `baseURL` 明确指向自建/中转地址 → openai-completions（目录不认识这些
 *      地址，官方会落到协议表首项）；
 *   4. 以上都定不了 → "unknown"，调用方必须保守处理（不写 compat），
 *      因为写错一个键会让整次保存被官方拒绝。
 *
 * @param route - provider profile（api / baseURL）
 * @param routeName - 路由名（即 providers 字典的键）；命中内置目录时需要
 * @returns 协议名，或 "unknown"
 */
export function resolveProtocol(route, routeName) {
  const declared = typeof route?.api === "string" && route.api.length > 0 ? route.api : undefined;
  if (declared !== undefined) return declared;

  const name = typeof routeName === "string" ? routeName.toLowerCase() : "";
  if (Object.prototype.hasOwnProperty.call(BUILTIN_ROUTE_PROTOCOLS, name)) {
    const builtin = BUILTIN_ROUTE_PROTOCOLS[name];
    if (builtin !== undefined) return builtin;
    return "unknown"; // 目录里有这个名字但多协议并存，必须显式声明
  }

  const baseURL = typeof route?.baseURL === "string" ? route.baseURL : "";
  if (baseURL.length > 0) {
    if (baseURL.toLowerCase().includes("anthropic")) return "anthropic-messages";
    if (isSelfHostedEndpointUrl(baseURL)) return "openai-completions";
  }
  return "unknown";
}

/**
 * 该 route 是否**确定**吃 openai-completions 那套 compat 开关。
 * 判不出来一律 false：少补一个键只是少个功能，写错一个键会让整次保存失败。
 */
function takesOpenAiCompat(route, routeName) {
  return resolveProtocol(route, routeName) === "openai-completions";
}

/** 是否自建/中转端点（需要把系统提示词 role 钉回 system）。 */
export function isSelfHostedRelay(route, routeName) {
  const baseURL = route?.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) return false;
  const protocol = resolveProtocol(route, routeName);
  return protocol === "openai-completions" && isSelfHostedEndpointUrl(baseURL);
}

/** 从 route 的 baseURL / 名字推断线上方言。 */
export function inferThinkingFormat(route) {
  const baseURL = typeof route?.baseURL === "string" ? route.baseURL.toLowerCase() : "";
  if (baseURL.includes("deepseek.com")) return "deepseek";
  if (baseURL.includes("api.z.ai") || baseURL.includes("bigmodel.cn")) return "zai";
  return undefined;
}

/**
 * 生成 compat 补丁：只补"不补就会坏"的键，绝不删除已有键。
 * @param route - 该 provider 的 profile（含 api / baseURL）
 * @param hint - 知识库或外部目录给出的 compat 建议
 * @returns 需要合并进模型 compat 的键值，或 undefined
 */
export function inferCompat(route, hint, routeName) {
  // 协议不是 openai-completions（或判不出来）时，一个 compat 键都不写：
  // anthropic-messages 认的是 supportsEagerToolInputStreaming /
  // supportsCacheControlOnTools 等另一套开关，写错会被官方整体拒绝。
  if (!takesOpenAiCompat(route, routeName)) return undefined;
  const patch = {};
  const format = hint?.thinkingFormat ?? inferThinkingFormat(route);
  if (format !== undefined) patch.thinkingFormat = format;
  if (hint?.supportsReasoningEffort !== undefined) patch.supportsReasoningEffort = hint.supportsReasoningEffort;
  else if (format !== undefined) patch.supportsReasoningEffort = true;
  if (isSelfHostedRelay(route, routeName)) patch.supportsDeveloperRole = false;
  return Object.keys(patch).length > 0 ? patch : undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// 档位梯子
// ────────────────────────────────────────────────────────────────────────────

/**
 * 由档位名集合生成 reasoningEfforts 字典。
 * @param levels - 档位名数组（顺序无关）
 * @param wireOverrides - 覆盖某档的线上写法（例如 {off:"no_think"}）
 * @param route - provider profile，用于把 off 的写法按方言修正
 */
export function ladderFromLevels(levels, wireOverrides, route) {
  const wanted = new Set((levels ?? []).filter((level) => THINKING_LEVELS.includes(level)));
  if (wanted.size === 0) return undefined;
  const format = inferThinkingFormat(route);
  const out = {};
  for (const level of THINKING_LEVELS) {
    if (!wanted.has(level)) continue;
    if (wireOverrides && Object.hasOwn(wireOverrides, level)) {
      out[level] = wireOverrides[level];
      continue;
    }
    if (level === "off") {
      // deepseek 方言：不明确关闭就会思考，off 必须显式发 thinking:{type:disabled}，
      // 由 thinkingFormat 负责翻译，因此这里给一个非空占位值。
      out[level] = format === "deepseek" ? "none" : null;
      continue;
    }
    out[level] = DEFAULT_WIRE[level];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 读出模型当前的声明状态，供 UI 显示三态。 */
export function describeEfforts(model) {
  const declared = model?.reasoningEfforts;
  if (declared === false) return { mode: "off", levels: [], efforts: undefined };
  if (declared === undefined || declared === null) return { mode: "inherit", levels: [], efforts: undefined };
  if (typeof declared !== "object" || Array.isArray(declared)) return { mode: "inherit", levels: [], efforts: undefined };
  const levels = THINKING_LEVELS.filter((level) => Object.hasOwn(declared, level));
  if (levels.length === 0) return { mode: "inherit", levels: [], efforts: undefined };
  return { mode: "custom", levels, efforts: { ...declared } };
}

// ────────────────────────────────────────────────────────────────────────────
// 第二层：网关 /models 探测
// ────────────────────────────────────────────────────────────────────────────

/**
 * 把一份任意模态列表收敛到 harness 的 `text` / `image` 词表。
 *
 * 端点常声明 `video` / `pdf` / `audio` 这些本 harness 表达不了的模态：
 * 只要列表里出现 `image` 就认图片能力（多出来的模态忽略，不会因此判错），
 * 否则退化为 `["text"]`——`text` 是官方默认值，也是唯一合法的空集替身。
 * @param list - 原始模态列表（任意大小写）
 * @returns `["text"]` / `["text","image"]` / `["image"]`，无法判断时 undefined
 */
export function toHarnessModalities(list) {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const lowered = new Set(list.map((item) => String(item).toLowerCase()));
  const known = ["text", "image"].filter((item) => lowered.has(item));
  if (known.length === 0) return undefined;
  return known;
}

/**
 * 从"布尔能力标志"推断模态。
 *
 * 有些网关不用列表，而是给一堆布尔：`vision` / `supports_vision` /
 * `supports_images` / `multimodal` / `capabilities.vision` / `abilities.vision`。
 * 任一为 true 即认为支持图片；显式全为 false 时返回 `["text"]`（明确不支持）；
 * 一个标志都没有时返回 undefined（沉默 ≠ 不支持）。
 * @param entry - 原始 /models 条目
 * @returns `["text","image"]` / `["text"]` / undefined
 */
function visionFlagsToModalities(entry) {
  const flags = [
    entry.vision,
    entry.supports_vision,
    entry.supports_images,
    entry.multimodal,
    entry.capabilities?.vision,
    entry.capabilities?.images,
    entry.abilities?.vision,
  ].filter((value) => typeof value === "boolean");
  if (flags.length === 0) return undefined;
  return flags.some((value) => value === true) ? ["text", "image"] : ["text"];
}

/** 从任意字段里读一个正整数（用于 contextWindow / maxTokens）。 */
function positiveInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : undefined;
}

/**
 * 解析一个原始 /models 列表条目，读它自己声明的能力。
 * 覆盖字段约定：
 *   - 推理：supported_parameters / supported_features / supports_reasoning /
 *     can_reason / reasoning.supported_efforts；
 *   - 容量：context_length / context_window / contextWindow /
 *     max_context_length / max_model_len / max_completion_tokens /
 *     max_output_tokens / top_provider.*；
 *   - 模态：input_modalities / modalities（对象或数组）/ architecture.input_modalities。
 * "没说话"必须与"明确不支持"区分开：推理返回 'unknown'，容量/模态返回 undefined。
 */
export function analyzeListingEntry(entry) {
  const signal = {
    reasoning: "unknown",
    levels: undefined,
    source: null,
    input: undefined,
    contextLength: undefined,
    maxTokens: undefined,
  };
  if (entry === null || typeof entry !== "object") return signal;

  const listFields = ["supported_parameters", "supported_features", "capabilities"];
  for (const field of listFields) {
    const value = entry[field];
    if (!Array.isArray(value)) continue;
    const lowered = value.map((item) => String(item).toLowerCase());
    const hasEffort = lowered.some((item) => item.includes("reasoning_effort") || item.includes("reasoning"));
    if (hasEffort) {
      signal.reasoning = true;
      signal.source = field;
      // OpenRouter 会在 supported_parameters 里列出 reasoning_effort，
      // 但具体档位在 reasoning.supported_efforts 里，由调用方补。
      break;
    }
  }

  const reasoning = entry.reasoning;
  if (reasoning && typeof reasoning === "object" && !Array.isArray(reasoning)) {
    signal.reasoning = true;
    signal.source = signal.source ?? "reasoning";
    if (Array.isArray(reasoning.supported_efforts)) {
      signal.levels = reasoning.supported_efforts.map((item) => String(item).toLowerCase());
    }
    signal.mandatory = reasoning.mandatory === true;
    signal.defaultEffort = typeof reasoning.default_effort === "string" ? reasoning.default_effort : undefined;
  } else if (typeof reasoning === "boolean") {
    signal.reasoning = reasoning;
    signal.source = signal.source ?? "reasoning";
  }

  for (const field of ["supports_reasoning", "supportsReasoning", "can_reason"]) {
    if (typeof entry[field] === "boolean") {
      signal.reasoning = entry[field];
      signal.source = signal.source ?? field;
    }
  }

  // ── 模态 ──
  // 先看显式列表（最精确），再退到布尔标志（workbuddy 这类网关会同时给两套）。
  const rawInput = entry.input_modalities
    ?? (Array.isArray(entry.modalities) ? entry.modalities : undefined)
    ?? entry.modalities?.input
    ?? entry.architecture?.input_modalities;
  const fromList = toHarnessModalities(
    rawInput ?? (typeof entry.modalities === "string" ? entry.modalities.split(/[+>]/) : undefined),
  );
  signal.input = fromList ?? visionFlagsToModalities(entry);

  // ── 容量 ──
  // 上下文窗口：不同网关的字段名差异很大，按优先级逐个试。
  const contextCandidates = [
    entry.context_length,
    entry.context_window,
    entry.contextWindow,
    entry.max_context_length,
    entry.max_model_len,
    entry.max_input_tokens,
    entry.top_provider?.context_length,
    // 有的网关给的是候选窗口数组（如 workbuddy 的 [300000, 1000000]）：
    // 取最大值作为"该模型能用的上下文上限"。
    Array.isArray(entry.context_windows) ? Math.max(...entry.context_windows.filter((n) => typeof n === "number")) : undefined,
  ];
  for (const candidate of contextCandidates) {
    const value = positiveInt(candidate);
    if (value !== undefined) {
      signal.contextLength = value;
      break;
    }
  }
  const outputCandidates = [
    entry.max_completion_tokens,
    entry.max_output_tokens,
    entry.max_tokens,
    entry.top_provider?.max_completion_tokens,
  ];
  for (const candidate of outputCandidates) {
    const value = positiveInt(candidate);
    if (value !== undefined) {
      signal.maxTokens = value;
      break;
    }
  }

  return signal;
}

/**
 * 从探测到的条目构造建议（网关层，最高置信度）。
 *
 * 档位与容量分开返回：端点可能只说了容量没说档位（或反之），
 * 两者各自独立生效——`capacities` 即使在没有档位建议时也可以有值。
 */
export function suggestFromListing(route, model, entry, routeName) {
  const signal = analyzeListingEntry(entry);
  const capacities = capacitiesFromSignal(signal, "gateway");
  if (signal.reasoning !== true) {
    // 端点没说推理能力，但说了容量/模态：容量照给，档位留空不预填，
    // 由 buildSuggestion 继续往知识库/外部目录要档位与容量。
    return capacities === undefined
      ? undefined
      : { mode: "custom", weak: true, source: "gateway", confidence: "low", matched: typeof entry?.id === "string" ? entry.id : undefined, capacities, note: "仅容量" };
  }
  const named = (signal.levels ?? []).filter((level) => THINKING_LEVELS.includes(level));
  const weak = named.length === 0;
  let levels = named;
  if (weak) {
    // 端点只说了"能推理"，没说档位：给最保守的两档（关 / 高），
    // 而不是编造一整条梯子。weak 标记让调用方把它排在知识库之后。
    levels = signal.mandatory === true ? ["high"] : ["off", "high"];
  } else if (signal.mandatory !== true && !levels.includes("off")) {
    levels = ["off", ...levels];
  }
  const hint = familyHint(model);
  const efforts = ladderFromLevels(levels, offOverride(hint), route);
  if (efforts === undefined) return undefined;
  return {
    mode: "custom",
    weak,
    efforts,
    compat: inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }, routeName),
    capacities,
    source: "gateway",
    confidence: weak ? "low" : CONFIDENCE.gateway,
    matched: typeof entry?.id === "string" ? entry.id : undefined,
    note: `${signal.source ?? "listing"} · ${levels.join("/")}`,
  };
}

/** 把探测信号的容量/模态部分打包成 UI 可直接用的形状。 */
export function capacitiesFromSignal(signal, source) {
  if (signal === undefined || signal === null) return undefined;
  const out = {};
  if (signal.contextLength !== undefined) out.contextWindow = signal.contextLength;
  if (signal.maxTokens !== undefined) out.maxTokens = signal.maxTokens;
  if (signal.input !== undefined) out.input = signal.input;
  if (Object.keys(out).length === 0) return undefined;
  out.source = source;
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// 第三层：外部目录（OpenRouter / models.dev / LiteLLM）
// ────────────────────────────────────────────────────────────────────────────

/** 外部目录的可信度排序：数字越小越可信（OpenRouter 的档位是逐模型策展的）。 */
const EXTERNAL_RANK = Object.freeze({ openrouter: 0, litellm: 1, "models.dev": 2 });

/**
 * 合并同名条目的两份能力描述：档位按可信度取，"有值"优先于"没值"。
 *
 * 三个目录的字段完整度不一样（OpenRouter 几乎全有容量、LiteLLM 只有
 * 一部分模型有模态标志），所以不能整条替换——那会丢掉另一份里的容量。
 */
function mergeExternalValue(previous, value) {
  const rank = EXTERNAL_RANK[value.source] ?? 9;
  const previousRank = EXTERNAL_RANK[previous.source] ?? 9;
  const newer = rank < previousRank || (rank === previousRank && (value.levels?.length ?? 0) > (previous.levels?.length ?? 0));
  const pick = (left, right) => {
    const chosen = newer
      ? (right !== undefined ? right : left)
      : (left !== undefined ? left : right);
    return chosen;
  };
  return {
    source: newer ? value.source : previous.source,
    levels: pick(previous.levels, value.levels),
    mandatory: pick(previous.mandatory, value.mandatory),
    defaultEffort: pick(previous.defaultEffort, value.defaultEffort),
    contextWindow: pick(previous.contextWindow, value.contextWindow),
    maxTokens: pick(previous.maxTokens, value.maxTokens),
    input: pick(previous.input, value.input),
  };
}

/**
 * 把三个外部目录统一成一张 `归一 id → 能力` 表。
 *
 * 同名条目可能来自多个 provider（厂商 + 一堆中转），`put` 按
 * {@link EXTERNAL_RANK} 取更可信的那个，而不是取"档位最多"的那个——
 * 后者会让某个中转的过度声明覆盖厂商真实能力。容量/模态按"有值优先"合并。
 */
export function buildExternalIndex(catalogs) {
  const index = new Map();
  const put = (key, value) => {
    const normalized = normalizeId(key);
    if (normalized.length < 4) return; // 太短的名字不参与匹配，避免误伤
    if (value.contextWindow === undefined && value.maxTokens === undefined && value.input === undefined
      && (value.levels === undefined || value.levels.length === 0)) return; // 什么都不知道就不占位
    const previous = index.get(normalized);
    index.set(normalized, previous === undefined ? value : mergeExternalValue(previous, value));
  };

  const openrouter = catalogs?.openrouter?.data;
  if (Array.isArray(openrouter)) {
    for (const model of openrouter) {
      if (model === null || typeof model !== "object") continue;
      const reasoning = model.reasoning && typeof model.reasoning === "object" ? model.reasoning : undefined;
      const levels = Array.isArray(reasoning?.supported_efforts)
        ? reasoning.supported_efforts.map((item) => String(item).toLowerCase())
        : undefined;
      const value = {
        source: "openrouter",
        levels,
        mandatory: reasoning?.mandatory === true,
        defaultEffort: typeof reasoning?.default_effort === "string" ? reasoning.default_effort : undefined,
        contextWindow: positiveInt(model.top_provider?.context_length) ?? positiveInt(model.context_length),
        maxTokens: positiveInt(model.top_provider?.max_completion_tokens),
        input: toHarnessModalities(model.architecture?.input_modalities),
      };
      put(model.id, value);
      if (typeof model.name === "string") put(model.name, value);
    }
  }

  const modelsDev = catalogs?.modelsDev;
  if (modelsDev !== null && typeof modelsDev === "object") {
    for (const provider of Object.values(modelsDev)) {
      const models = provider?.models;
      if (models === null || typeof models !== "object") continue;
      for (const model of Object.values(models)) {
        if (model === null || typeof model !== "object") continue;
        const options = Array.isArray(model.reasoning_options) ? model.reasoning_options : [];
        const effortOption = options.find((option) => option?.type === "effort" && Array.isArray(option.values));
        const value = {
          source: "models.dev",
          levels: effortOption === undefined
            ? (model.reasoning === true ? ["off", "high"] : undefined)
            : ["off", ...effortOption.values.map((item) => String(item).toLowerCase())],
          mandatory: false,
          contextWindow: positiveInt(model.limit?.context),
          maxTokens: positiveInt(model.limit?.output),
          input: toHarnessModalities(model.modalities?.input),
        };
        put(model.id, value);
        if (typeof model.name === "string") put(model.name, value);
      }
    }
  }

  const litellm = catalogs?.litellm;
  if (litellm !== null && typeof litellm === "object") {
    for (const [id, model] of Object.entries(litellm)) {
      if (model === null || typeof model !== "object") continue;
      let levels;
      if (model.supports_reasoning === true) {
        if (Array.isArray(model.reasoning_effort_levels)) {
          levels = ["off", ...model.reasoning_effort_levels.map((item) => String(item).toLowerCase())];
        } else {
          levels = ["high"];
          if (model.supports_none_reasoning_effort === true || model.supports_minimal_reasoning_effort === true) levels.unshift("off");
          if (model.supports_low_reasoning_effort === true) levels.push("low");
          if (model.supports_xhigh_reasoning_effort === true) levels.push("xhigh");
          if (model.supports_max_reasoning_effort === true) levels.push("max");
        }
      }
      // LiteLLM 用布尔标志描述模态；只认 vision→image，text 恒在。
      let input;
      if (model.supports_vision === true) input = ["text", "image"];
      const value = {
        source: "litellm",
        levels,
        mandatory: model.thinking_always_on === true,
        defaultEffort: typeof model.default_reasoning_effort === "string" ? model.default_reasoning_effort : undefined,
        contextWindow: positiveInt(model.max_input_tokens),
        maxTokens: positiveInt(model.max_output_tokens),
        input,
      };
      put(id, value);
    }
  }

  return index;
}

/**
 * 在外部索引里为某个模型找命中，返回命中的键（供 UI 展示"匹配到谁"）。
 *
 * **必须锚定在本地 id 的开头**：中转/网关改写过的 id 通常是在官方 id 后面
 * 追加后缀（`-free` / `-highspeed` / `-luna` / `-f`），而不是在前面加垃圾。
 * 不锚定就会出现 `k3-256k` 命中目录里的 `256k`、`agnes-2.5-flash` 命中
 * `2.5 flash` 这类误配——宁可判"不知道"，也不能把别人的档位写进你的配置。
 * @param index - buildExternalIndex 的结果
 * @param model - 模型条目（id / name）
 * @returns { key, value } 或 undefined
 */
export function matchExternalDetailed(index, model) {
  const haystack = haystackOf(model);
  let best;
  for (const [key, value] of index) {
    if (!haystack.startsWith(key)) continue;
    const next = haystack[key.length];
    if (next !== undefined && next !== " ") continue; // 必须落在词边界上
    if (best === undefined || key.length > best.key.length) best = { key, value };
  }
  return best;
}

/** 兼容旧签名：只要命中值。 */
export function matchExternal(index, model) {
  return matchExternalDetailed(index, model)?.value;
}

/**
 * 从外部目录命中构造建议。
 *
 * 只有目录**明说了档位**才算强建议；只说"这个模型能推理"的弱信号由
 * {@link buildSuggestion} 放在内置知识库之后使用，避免用一条通用梯子
 * 盖掉更贴合家族的知识库条目。
 */
export function suggestFromExternal(route, model, index, routeName) {
  if (index === undefined || index.size === 0) return undefined;
  const hit = matchExternalDetailed(index, model);
  if (hit === undefined) return undefined;
  const { key, value } = hit;
  // 容量/模态：目录里有什么就用什么，知识库的家族值仅在目录没给时兜底。
  const hint = familyHint(model);
  const externalCapacities = capacitiesFromExternalValue(value, key);
  const knowledgeCapacities = capacitiesFromKnowledge(model, hint);
  const capacities = externalCapacities === undefined
    ? knowledgeCapacities
    : knowledgeCapacities === undefined
      ? externalCapacities
      : {
          ...knowledgeCapacities,
          ...externalCapacities,
          contextWindow: externalCapacities.contextWindow ?? knowledgeCapacities.contextWindow,
          maxTokens: externalCapacities.maxTokens ?? knowledgeCapacities.maxTokens,
          input: externalCapacities.input ?? knowledgeCapacities.input,
        };

  if (!Array.isArray(value.levels) || value.levels.length === 0) {
    // 弱信号（目录只说"能推理"，甚至只说容量）：给保守档位 + 已知容量。
    const conservative = ladderFromLevels(["off", "high"], offOverride(hint), route);
    if (conservative === undefined) return undefined;
    return {
      mode: "custom",
      weak: true,
      efforts: conservative,
      compat: inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }, routeName),
      capacities,
      source: "external",
      confidence: "low",
      matched: key,
      note: `${value.source} · 只说能推理`,
    };
  }
  let levels = value.levels.filter((level) => THINKING_LEVELS.includes(level));
  if (levels.length === 0) return undefined;
  if (value.mandatory === true) levels = levels.filter((level) => level !== "off");
  const efforts = ladderFromLevels(levels, offOverride(hint), route);
  if (efforts === undefined) return undefined;
  return {
    mode: "custom",
    efforts,
    compat: inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }, routeName),
    input: hint?.input,
    capacities,
    source: "external",
    confidence: CONFIDENCE.external,
    matched: key,
    note: `${value.source} · ${levels.join("/")}`,
  };
}

/** 外部目录条目 → 容量建议。 */
function capacitiesFromExternalValue(value, key) {
  const out = {};
  if (value.contextWindow !== undefined) out.contextWindow = value.contextWindow;
  if (value.maxTokens !== undefined) out.maxTokens = value.maxTokens;
  if (value.input !== undefined) out.input = value.input;
  if (Object.keys(out).length === 0) return undefined;
  out.source = "external";
  out.matched = key;
  return out;
}

/** 内置知识库条目 → 容量建议（家族级，只做兜底）。 */
function capacitiesFromKnowledge(model, hint) {
  const entry = matchKnowledge(model);
  if (entry === undefined) return undefined;
  const out = {};
  if (entry.contextWindow !== undefined) out.contextWindow = entry.contextWindow;
  if (entry.maxTokens !== undefined) out.maxTokens = entry.maxTokens;
  const input = entry.input ?? hint?.input;
  if (input !== undefined) out.input = [...input];
  if (Object.keys(out).length === 0) return undefined;
  out.source = "knowledge";
  out.matched = entry.id;
  return out;
}

/**
 * 单独给出一个模型的容量建议（不给档位时也要能填）。
 * 供 host 的 suggest 路由与 UI 的"手写档位"路径复用。
 */
export function capacitySuggestionFor(route, model, externalIndex, listingEntry) {
  if (listingEntry !== undefined) {
    const fromGateway = capacitiesFromSignal(analyzeListingEntry(listingEntry), "gateway");
    if (fromGateway !== undefined) return fromGateway;
  }
  if (externalIndex !== undefined && externalIndex.size > 0) {
    const hit = matchExternalDetailed(externalIndex, model);
    if (hit !== undefined) {
      const fromExternal = capacitiesFromExternalValue(hit.value, hit.key);
      if (fromExternal !== undefined) return fromExternal;
    }
  }
  return capacitiesFromKnowledge(model, familyHint(model));
}

// ────────────────────────────────────────────────────────────────────────────
// 合并：三层按优先级取第一条能用的
// ────────────────────────────────────────────────────────────────────────────

/**
 * 为单个模型给出建议，按可信度依次尝试：
 *   1. 网关 /models **明说了档位** —— 最权威（那是你自己端点的话）
 *   2. 外部目录**明说了档位**（OpenRouter 策展 > LiteLLM > models.dev）
 *   3. 内置知识库 —— 家族级策展，覆盖中转改写的 id
 *   4. 网关只说"能推理"的弱信号 → 保守两档
 *   5. 外部目录只说"能推理"的弱信号 → 保守两档
 * 全都没有就返回 undefined（宁可不建议，也不猜）。
 *
 * @param options.route - provider profile（api / baseURL / displayName）
 * @param options.model - 模型条目（id / name）
 * @param options.listingEntry - 该网关 /models 里的原始条目（可缺）
 * @param options.externalIndex - buildExternalIndex 的结果（可缺）
 */
export function buildSuggestion(options) {
  const { route, model, listingEntry, externalIndex, routeName } = options;

  const fromGateway = listingEntry === undefined ? undefined : suggestFromListing(route, model, listingEntry, routeName);
  if (fromGateway !== undefined && fromGateway.weak !== true) return fromGateway;

  const fromExternal = suggestFromExternal(route, model, externalIndex, routeName);
  if (fromExternal !== undefined && fromExternal.weak !== true) return fromExternal;

  const entry = matchKnowledge(model);
  const knowledgeCapacities = capacitiesFromKnowledge(model, familyHint(model));
  if (entry !== undefined) {
    const levels = THINKING_LEVELS.filter((level) => Object.hasOwn(entry.efforts, level));
    const efforts = ladderFromLevels(levels, entry.efforts, route);
    if (efforts !== undefined) {
      return {
        mode: "custom",
        efforts,
        compat: inferCompat(route, { ...entry.compat, thinkingFormat: entry.compat?.thinkingFormat ?? inferThinkingFormat(route) }, routeName),
        capacities: knowledgeCapacities,
        input: entry.input,
        source: "knowledge",
        confidence: CONFIDENCE.knowledge,
        matched: entry.id,
        note: `knowledge:${entry.id}`,
      };
    }
  }

  // 谁先说话谁先被采用，但"容量"与"档位"可以来自不同层：
  // 典型场景是网关只报了 context_length，档位得靠知识库/目录。
  const fallback = fromGateway ?? fromExternal;
  if (fallback === undefined) {
    if (knowledgeCapacities === undefined) return undefined;
    return { mode: "custom", weak: true, source: "knowledge", confidence: "low", matched: entry?.id, capacities: knowledgeCapacities, note: "仅容量" };
  }
  if (fallback.capacities === undefined && knowledgeCapacities !== undefined) {
    return { ...fallback, capacities: knowledgeCapacities };
  }
  // 档位层不懂的知识库容量/模态，按字段补齐（不覆盖已有值）。
  if (knowledgeCapacities !== undefined && entry !== undefined) {
    const merged = {
      ...knowledgeCapacities,
      ...fallback.capacities,
      contextWindow: fallback.capacities?.contextWindow ?? knowledgeCapacities.contextWindow,
      maxTokens: fallback.capacities?.maxTokens ?? knowledgeCapacities.maxTokens,
      input: fallback.capacities?.input ?? knowledgeCapacities.input,
    };
    return { ...fallback, capacities: merged };
  }
  return fallback;
}

/**
 * 单独给出一个模型的 compat 建议（不含梯子）。
 *
 * UI 用它来支持"用户自己勾档位"这条路径：梯子可以是手写的，但
 * `thinkingFormat` / `supportsDeveloperRole` 这类"不补就会坏"的键
 * 仍应自动补上。
 * @param route - provider profile（api / baseURL）
 * @param model - 模型条目（id / name）
 */
export function compatHintFor(route, model, routeName) {
  const hint = familyHint(model);
  return inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }, routeName);
}

/**
 * 只补用户没写过的键（compat 合并语义）：绝不删除已有声明。
 * @returns 合并后的 compat，或 undefined 表示无需改动
 */
export function mergeCompat(existing, patch) {
  if (patch === undefined) return undefined;
  const base = existing !== null && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  let changed = false;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (out[key] === value) continue;
    out[key] = value;
    changed = true;
  }
  return changed ? out : undefined;
}

/** 建议的线上写法是否合法（官方 schema：非 off 档不允许空值/空串）。 */
export function isSendableLadder(efforts) {
  if (efforts === null || typeof efforts !== "object" || Array.isArray(efforts)) return false;
  const entries = Object.entries(efforts);
  if (entries.length === 0) return false;
  if (!entries.some(([level]) => level !== "off")) return false;
  for (const [level, wire] of entries) {
    if (!THINKING_LEVELS.includes(level)) return false;
    if (wire === null) {
      if (level !== "off") return false;
      continue;
    }
    if (typeof wire !== "string" || wire.length === 0) return false;
  }
  return true;
}
