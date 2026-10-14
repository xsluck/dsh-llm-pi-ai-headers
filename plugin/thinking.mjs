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
    input: ["text", "image"],
  },
  {
    id: "deepseek-v4.1-flash",
    patterns: ["deepseek-v4.1-flash", "deepseek-v4.1", "deepseek-flash"],
    efforts: { off: "none", low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "deepseek-v4",
    patterns: ["deepseek-v4", "deepseek-v3.2", "deepseek-reasoner"],
    efforts: { off: "none", low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "glm-5.3",
    patterns: ["glm-5.3", "glm-5-3", "glm-5.3-flash"],
    efforts: { low: "low", high: "high", max: "max" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "glm-5.2",
    patterns: ["glm-5.2", "glm-5-2"],
    efforts: { off: "none", minimal: "minimal", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "glm-4.6v",
    patterns: ["glm-4.6v", "glm-4-6v", "glm-4v", "glm-5v"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "glm-generic",
    patterns: ["glm-5-turbo", "glm-5", "chatglm"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "zai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "qwen3.8",
    patterns: ["qwen3.8", "qwen-3.8", "qwen3-8"],
    efforts: { off: null, low: "low", medium: "medium", xhigh: "xhigh" },
    compat: { thinkingFormat: "qwen", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "qwen3.8-flash-next",
    patterns: ["qwen3.8-flash-next", "qwen3.8-flash", "qwen-local"],
    efforts: { off: null, low: "low", medium: "medium", xhigh: "xhigh" },
    compat: { thinkingFormat: "qwen", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "kimi-k3",
    // 裸 `k3` / `k3-256k` 是中转改写过的 Kimi K3，公共目录里查不到，
    // 但名字能确定家族——单独收一条，正好补上外部目录的盲区。
    patterns: ["kimi-k3", "kimi-for-coding", "moonshot-v1", "k3-256k", "k3"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "kimi",
    patterns: ["kimi", "moonshot"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "minimax-m3",
    patterns: ["minimax-m3"],
    efforts: { off: null, high: "high" },
    compat: { thinkingFormat: "deepseek", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "hunyuan-hy4",
    patterns: ["hy4-preview", "hy-4-preview", "hy4"],
    efforts: { off: "no_think", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "hunyuan-hy3",
    patterns: ["hy3", "hunyuan"],
    efforts: { low: "low", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "openai-gpt-6",
    patterns: ["gpt-6"],
    efforts: { low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5.6",
    patterns: ["gpt-5.6"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5.5",
    patterns: ["gpt-5.5"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5.4",
    patterns: ["gpt-5.4"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "openai-gpt-5",
    patterns: ["gpt-5.3", "gpt-5.2", "gpt-5.1", "gpt-5"],
    efforts: { off: "none", minimal: "minimal", low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "google-gemini",
    patterns: ["gemini"],
    efforts: { low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "mimo-v2.6",
    patterns: ["mimo-v2.6", "mimo-v2-6"],
    efforts: { off: "none", low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text", "image"],
  },
  {
    id: "grok",
    patterns: ["grok"],
    efforts: { off: "none", low: "low", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
    input: ["text"],
  },
  {
    id: "claude",
    patterns: ["claude"],
    efforts: { off: null, low: "low", medium: "medium", high: "high" },
    compat: { thinkingFormat: "openai", supportsReasoningEffort: true },
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
export function isSelfHostedRelay(route) {
  const api = String(route?.api ?? "openai-completions").toLowerCase();
  if (api !== "openai-completions") return false;
  const baseURL = route?.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) return false;
  let host;
  try {
    host = new URL(baseURL).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host.includes(".")) return false;
  return !OFFICIAL_DOMAINS.some((root) => host === root || host.endsWith("." + root));
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
export function inferCompat(route, hint) {
  const patch = {};
  const format = hint?.thinkingFormat ?? inferThinkingFormat(route);
  if (format !== undefined) patch.thinkingFormat = format;
  if (hint?.supportsReasoningEffort !== undefined) patch.supportsReasoningEffort = hint.supportsReasoningEffort;
  else if (format !== undefined) patch.supportsReasoningEffort = true;
  if (isSelfHostedRelay(route)) patch.supportsDeveloperRole = false;
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
 * 解析一个原始 /models 列表条目，读它自己声明的推理能力。
 * 覆盖的字段约定：supported_parameters / supported_features /
 * supports_reasoning / can_reason / reasoning_effort / capabilities。
 * "没说话"必须与"明确不支持"区分开：前者返回 'unknown'。
 */
export function analyzeListingEntry(entry) {
  const signal = { reasoning: "unknown", levels: undefined, source: null, input: undefined, contextLength: undefined };
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

  const input = entry.input_modalities ?? entry.modalities;
  if (Array.isArray(input)) signal.input = input.map((item) => String(item).toLowerCase());
  if (typeof entry.context_length === "number") signal.contextLength = entry.context_length;

  return signal;
}

/** 从探测到的档位名集合构造建议（网关层，最高置信度）。 */
export function suggestFromListing(route, model, entry) {
  const signal = analyzeListingEntry(entry);
  if (signal.reasoning !== true) return undefined;
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
    compat: inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }),
    source: "gateway",
    confidence: weak ? "low" : CONFIDENCE.gateway,
    matched: typeof entry?.id === "string" ? entry.id : undefined,
    note: `${signal.source ?? "listing"} · ${levels.join("/")}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 第三层：外部目录（OpenRouter / models.dev / LiteLLM）
// ────────────────────────────────────────────────────────────────────────────

/** 外部目录的可信度排序：数字越小越可信（OpenRouter 的档位是逐模型策展的）。 */
const EXTERNAL_RANK = Object.freeze({ openrouter: 0, litellm: 1, "models.dev": 2 });

/**
 * 把三个外部目录统一成一张 `归一 id → 能力` 表。
 *
 * 同名条目可能来自多个 provider（厂商 + 一堆中转），`put` 按
 * {@link EXTERNAL_RANK} 取更可信的那个，而不是取"档位最多"的那个——
 * 后者会让某个中转的过度声明覆盖厂商真实能力。
 */
export function buildExternalIndex(catalogs) {
  const index = new Map();
  const put = (key, value) => {
    const normalized = normalizeId(key);
    if (normalized.length < 4) return; // 太短的名字不参与匹配，避免误伤
    const previous = index.get(normalized);
    if (previous === undefined) {
      index.set(normalized, value);
      return;
    }
    const rank = EXTERNAL_RANK[value.source] ?? 9;
    const previousRank = EXTERNAL_RANK[previous.source] ?? 9;
    if (rank < previousRank) index.set(normalized, value);
    else if (rank === previousRank && (value.levels?.length ?? 0) > (previous.levels?.length ?? 0)) index.set(normalized, value);
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
      if (model.supports_reasoning !== true) continue;
      let levels;
      if (Array.isArray(model.reasoning_effort_levels)) {
        levels = ["off", ...model.reasoning_effort_levels.map((item) => String(item).toLowerCase())];
      } else {
        levels = ["high"];
        if (model.supports_none_reasoning_effort === true || model.supports_minimal_reasoning_effort === true) levels.unshift("off");
        if (model.supports_low_reasoning_effort === true) levels.push("low");
        if (model.supports_xhigh_reasoning_effort === true) levels.push("xhigh");
        if (model.supports_max_reasoning_effort === true) levels.push("max");
      }
      const value = {
        source: "litellm",
        levels,
        mandatory: model.thinking_always_on === true,
        defaultEffort: typeof model.default_reasoning_effort === "string" ? model.default_reasoning_effort : undefined,
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
export function suggestFromExternal(route, model, index) {
  if (index === undefined || index.size === 0) return undefined;
  const hit = matchExternalDetailed(index, model);
  if (hit === undefined) return undefined;
  const { key, value } = hit;
  if (!Array.isArray(value.levels) || value.levels.length === 0) {
    // 弱信号也要能落成一条可用的保守建议，否则 UI 没东西可预填。
    const hint = familyHint(model);
    const conservative = ladderFromLevels(["off", "high"], offOverride(hint), route);
    if (conservative === undefined) return undefined;
    return {
      mode: "custom",
      weak: true,
      efforts: conservative,
      compat: inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }),
      source: "external",
      confidence: "low",
      matched: key,
      note: `${value.source} · 只说能推理`,
    };
  }
  let levels = value.levels.filter((level) => THINKING_LEVELS.includes(level));
  if (levels.length === 0) return undefined;
  if (value.mandatory === true) levels = levels.filter((level) => level !== "off");
  const hint = familyHint(model);
  const efforts = ladderFromLevels(levels, offOverride(hint), route);
  if (efforts === undefined) return undefined;
  return {
    mode: "custom",
    efforts,
    compat: inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) }),
    input: hint?.input,
    source: "external",
    confidence: CONFIDENCE.external,
    matched: key,
    note: `${value.source} · ${levels.join("/")}`,
  };
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
  const { route, model, listingEntry, externalIndex } = options;

  const fromGateway = listingEntry === undefined ? undefined : suggestFromListing(route, model, listingEntry);
  if (fromGateway !== undefined && fromGateway.weak !== true) return fromGateway;

  const fromExternal = suggestFromExternal(route, model, externalIndex);
  if (fromExternal !== undefined && fromExternal.weak !== true) return fromExternal;

  const entry = matchKnowledge(model);
  if (entry !== undefined) {
    const levels = THINKING_LEVELS.filter((level) => Object.hasOwn(entry.efforts, level));
    const efforts = ladderFromLevels(levels, entry.efforts, route);
    if (efforts !== undefined) {
      return {
        mode: "custom",
        efforts,
        compat: inferCompat(route, { ...entry.compat, thinkingFormat: entry.compat?.thinkingFormat ?? inferThinkingFormat(route) }),
        input: entry.input,
        source: "knowledge",
        confidence: CONFIDENCE.knowledge,
        matched: entry.id,
        note: `knowledge:${entry.id}`,
      };
    }
  }

  if (fromGateway !== undefined) return fromGateway;
  if (fromExternal !== undefined) return fromExternal;
  return undefined;
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
export function compatHintFor(route, model) {
  const hint = familyHint(model);
  return inferCompat(route, { thinkingFormat: hint?.thinkingFormat ?? inferThinkingFormat(route) });
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
