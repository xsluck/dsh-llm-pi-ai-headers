/**
 * 思考强度纯逻辑层单测（node --test 之外的自带极简断言器，保持零依赖）。
 *
 * 运行：node test-thinking.mjs
 */
import assert from "node:assert/strict";
import {
  THINKING_LEVELS,
  analyzeListingEntry,
  capacitySuggestionFor,
  toHarnessModalities,
  buildExternalIndex,
  buildSuggestion,
  describeEfforts,
  inferCompat,
  isSelfHostedRelay,
  isSendableLadder,
  ladderFromLevels,
  matchKnowledge,
  mergeCompat,
  normalizeId,
  suggestFromExternal,
} from "./plugin/thinking.mjs";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("  ✓ " + name);
  } catch (error) {
    console.error("  ✗ " + name);
    console.error("    " + (error && error.message ? error.message : String(error)));
    process.exitCode = 1;
  }
}

const ROUTE_LOCAL = { api: "openai-completions", baseURL: "http://47.99.112.251:8788/v1" };
const ROUTE_OFFICIAL = { api: "openai-completions", baseURL: "https://api.deepseek.com/v1" };
const ROUTE_OPENCODE = { api: "openai-completions", baseURL: "https://opencode.ai/zen/v1" };

console.log("normalizeId");
test("去掉 openrouter 前缀与标点", () => {
  assert.equal(normalizeId("deepseek/deepseek-v4.1-flash"), "deepseek v4 1 flash");
});
test("去掉 vLLM 的 /models/ 前缀", () => {
  assert.equal(normalizeId("/models/Qwen3.8-27B-FP8"), "qwen3 8 27b fp8");
});

console.log("isSelfHostedRelay（developer 角色钉回的关键判据）");
test("公网 IP 中转 → 是自建", () => assert.equal(isSelfHostedRelay(ROUTE_LOCAL), true));
test("内网 IP → 是自建", () => assert.equal(isSelfHostedRelay({ api: "openai-completions", baseURL: "http://192.168.0.51:30001/v1" }), true));
test("官方 deepseek 域名 → 不是", () => assert.equal(isSelfHostedRelay(ROUTE_OFFICIAL), false));
test("opencode.ai → 不是", () => assert.equal(isSelfHostedRelay(ROUTE_OPENCODE), false));
test("anthropic-messages 协议不参与", () => assert.equal(isSelfHostedRelay({ api: "anthropic-messages", baseURL: "http://10.0.0.9/v1" }), false));
test("无 baseURL → 不是", () => assert.equal(isSelfHostedRelay({ api: "openai-completions" }), false));

console.log("内置知识库匹配");
test("deepseek-v4.1-flash 命中专用条目", () => {
  assert.equal(matchKnowledge({ id: "deepseek-v4.1-flash" })?.id, "deepseek-v4.1-flash");
});
test("glm-5.3-flash 最长命中 glm-5.3 而不是 glm-generic", () => {
  assert.equal(matchKnowledge({ id: "glm-5.3-flash" })?.id, "glm-5.3");
});
test("裸 k3 命中 kimi-k3（外部目录的盲区）", () => {
  assert.equal(matchKnowledge({ id: "k3" })?.id, "kimi-k3");
  assert.equal(matchKnowledge({ id: "k3-256k" })?.id, "kimi-k3");
});
test("hy4-preview-f 命中 hunyuan-hy4", () => {
  assert.equal(matchKnowledge({ id: "hy4-preview-f" })?.id, "hunyuan-hy4");
});
test("改写过的 gpt-5.6-luna 命中 gpt-5.6", () => {
  assert.equal(matchKnowledge({ id: "gpt-5.6-luna" })?.id, "openai-gpt-5.6");
});
test("无知识库匹配的模型返回 undefined（宁可不建议）", () => {
  assert.equal(matchKnowledge({ id: "agnes-3.0-flash" }), undefined);
  assert.equal(matchKnowledge({ id: "nemotron-3-ultra-free" }), undefined);
  assert.equal(matchKnowledge({ id: "muse-spark-1.2-contributor-free" }), undefined);
});

console.log("档位梯子与 compat");
test("off 在 deepseek 方言下写 none（必须显式关思考）", () => {
  const ladder = ladderFromLevels(["off", "high"], undefined, ROUTE_OFFICIAL);
  assert.deepEqual(ladder, { off: "none", high: "high" });
});
test("off 在 openai 方言下留空（=不传参数）", () => {
  const ladder = ladderFromLevels(["off", "high"], undefined, ROUTE_LOCAL);
  assert.deepEqual(ladder, { off: null, high: "high" });
});
test("知识库给的 off 写法优先于方言默认", () => {
  const ladder = ladderFromLevels(["off", "high"], { off: "no_think", high: "high" }, ROUTE_LOCAL);
  assert.deepEqual(ladder, { off: "no_think", high: "high" });
});
test("自建网关自动钉 supportsDeveloperRole:false", () => {
  assert.deepEqual(inferCompat(ROUTE_LOCAL, { thinkingFormat: "openai", supportsReasoningEffort: true }), {
    thinkingFormat: "openai",
    supportsReasoningEffort: true,
    supportsDeveloperRole: false,
  });
});
test("官方域名不钉 developer 角色", () => {
  const compat = inferCompat(ROUTE_OFFICIAL, { thinkingFormat: "deepseek", supportsReasoningEffort: true });
  assert.equal(compat.supportsDeveloperRole, undefined);
});
test("compat 合并只增不改不删", () => {
  const merged = mergeCompat({ customFlag: 1, thinkingFormat: "zai" }, { thinkingFormat: "openai", supportsDeveloperRole: false });
  assert.deepEqual(merged, { customFlag: 1, thinkingFormat: "openai", supportsDeveloperRole: false });
});
test("无需改动时返回 undefined", () => {
  assert.equal(mergeCompat({ a: 1 }, { a: 1 }), undefined);
});

console.log("三态读回（UI 显示用）");
test("未声明 = inherit", () => assert.equal(describeEfforts({}).mode, "inherit"));
test("false = 不支持推理", () => assert.equal(describeEfforts({ reasoningEfforts: false }).mode, "off"));
test("字典 = custom 且档位有序", () => {
  const state = describeEfforts({ reasoningEfforts: { high: "high", off: null } });
  assert.equal(state.mode, "custom");
  assert.deepEqual(state.levels, ["off", "high"]);
});

console.log("网关 /models 探测");
test("OpenRouter 式条目读出档位", () => {
  const signal = analyzeListingEntry({
    id: "deepseek/deepseek-v4.1-flash",
    supported_parameters: ["reasoning", "reasoning_effort"],
    reasoning: { supported_efforts: ["max", "high", "low"], mandatory: false },
  });
  assert.equal(signal.reasoning, true);
  assert.deepEqual(signal.levels, ["max", "high", "low"]);
});
test("裸 {id,object,owned_by} 保持 unknown（沉默 ≠ 不支持）", () => {
  const signal = analyzeListingEntry({ id: "x", object: "model", owned_by: "y" });
  assert.equal(signal.reasoning, "unknown");
});
test("端点只说能推理 → 给保守两档", () => {
  const suggestion = buildSuggestion({
    route: ROUTE_LOCAL,
    model: { id: "whatever-1" },
    listingEntry: { id: "whatever-1", supports_reasoning: true },
  });
  assert.deepEqual(suggestion.efforts, { off: null, high: "high" });
  assert.equal(suggestion.source, "gateway");
});
test("mandatory 端点不给 off 档", () => {
  const suggestion = buildSuggestion({
    route: ROUTE_LOCAL,
    model: { id: "m" },
    listingEntry: { id: "m", reasoning: { supported_efforts: ["high"], mandatory: true } },
  });
  assert.equal(Object.hasOwn(suggestion.efforts, "off"), false);
});

console.log("外部目录");
const CATALOGS = {
  openrouter: {
    data: [
      { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", reasoning: { supported_efforts: ["max", "high", "low"], mandatory: false } },
      { id: "z-ai/glm-5.3-prime", name: "GLM 5.3", reasoning: { supported_efforts: ["max", "high", "low"], mandatory: true } },
    ],
  },
  modelsDev: {
    deepinfra: { models: { "Qwen/Qwen3.8-27B": { id: "Qwen/Qwen3.8-27B", name: "Qwen3.8 27B", reasoning: true, reasoning_options: [{ type: "effort", values: ["low", "medium", "xhigh"] }] } } },
  },
  litellm: { "gpt-5.6-sol": { supports_reasoning: true, reasoning_effort_levels: ["minimal", "low", "high"], default_reasoning_effort: "high" } },
};
test("索引覆盖三个源", () => {
  const index = buildExternalIndex(CATALOGS);
  assert.ok(index.size >= 4, "索引条目数 " + index.size);
});
test("外部命中给出梯子（含 off）", () => {
  const index = buildExternalIndex(CATALOGS);
  const suggestion = suggestFromExternal(ROUTE_LOCAL, { id: "qwen3.8-27b" }, index);
  assert.equal(suggestion.source, "external");
  assert.ok(Object.hasOwn(suggestion.efforts, "off"));
  assert.ok(Object.hasOwn(suggestion.efforts, "xhigh"));
});
test("mandatory 的外部模型去掉 off", () => {
  const index = buildExternalIndex(CATALOGS);
  const suggestion = suggestFromExternal(ROUTE_LOCAL, { id: "glm-5.3-prime" }, index);
  assert.equal(Object.hasOwn(suggestion.efforts, "off"), false);
});

console.log("三层优先级");
test("网关 > 外部 > 知识库", () => {
  const index = buildExternalIndex(CATALOGS);
  const gateway = buildSuggestion({ route: ROUTE_LOCAL, model: { id: "deepseek-v4.1-flash" }, listingEntry: { id: "deepseek-v4.1-flash", reasoning: { supported_efforts: ["high"], mandatory: true } }, externalIndex: index });
  assert.equal(gateway.source, "gateway");
  const external = buildSuggestion({ route: ROUTE_LOCAL, model: { id: "qwen3.8-27b" }, externalIndex: index });
  assert.equal(external.source, "external");
  const knowledge = buildSuggestion({ route: ROUTE_LOCAL, model: { id: "k3" }, externalIndex: index });
  assert.equal(knowledge.source, "knowledge");
  assert.deepEqual(knowledge.efforts, { off: null, high: "high" });
  const none = buildSuggestion({ route: ROUTE_LOCAL, model: { id: "agnes-3.0-flash" }, externalIndex: index });
  assert.equal(none, undefined);
});

console.log("官方 schema 合法性自检");
test("合法梯子通过", () => assert.equal(isSendableLadder({ off: null, high: "high" }), true));
test("非 off 档留空被拒", () => assert.equal(isSendableLadder({ off: null, high: null }), false));
test("空串被拒", () => assert.equal(isSendableLadder({ high: "" }), false));
test("只有 off 被拒（官方要求至少一个思考档）", () => assert.equal(isSendableLadder({ off: "none" }), false));
test("未知档位名被拒", () => assert.equal(isSendableLadder({ ultra: "ultra" }), false));
test("档位全集与官方一致", () => assert.deepEqual(THINKING_LEVELS, ["off", "minimal", "low", "medium", "high", "xhigh", "max"]));

console.log("容量与支持类型（contextWindow / maxTokens / input）");
test("harness 词表收敛：video/pdf 只保留 image", () => {
  assert.deepEqual(toHarnessModalities(["text", "image", "video", "pdf"]), ["text", "image"]);
  assert.deepEqual(toHarnessModalities(["text"]), ["text"]);
  assert.equal(toHarnessModalities(["audio"]), undefined);
  assert.equal(toHarnessModalities([]), undefined);
});
test("网关条目读 context_length（bc 网关实测字段）", () => {
  const signal = analyzeListingEntry({ id: "MiniMax-M3", object: "model", owned_by: "gateway", context_length: 1048576 });
  assert.equal(signal.contextLength, 1048576);
  assert.equal(signal.maxTokens, undefined);
});
test("网关条目读 OpenRouter 式容量与模态", () => {
  const signal = analyzeListingEntry({
    id: "x",
    context_length: 1048576,
    top_provider: { context_length: 1048576, max_completion_tokens: 131072 },
    architecture: { input_modalities: ["text", "image", "video"] },
  });
  assert.equal(signal.contextLength, 1048576);
  assert.equal(signal.maxTokens, 131072);
  assert.deepEqual(signal.input, ["text", "image"]);
});
test("只说容量不说推理时也给容量建议（档位不预填）", () => {
  const suggestion = buildSuggestion({
    route: ROUTE_LOCAL,
    model: { id: "unknown-model-1" },
    listingEntry: { id: "unknown-model-1", context_length: 262144 },
  });
  assert.equal(suggestion.source, "gateway");
  assert.equal(suggestion.capacities.contextWindow, 262144);
  // 端点没提推理能力：容量照给，但档位绝不猜（efforts 留空 → UI 不预填档位）
  assert.equal(suggestion.efforts, undefined);
});
test("外部目录带容量：models.dev limit", () => {
  const index = buildExternalIndex({
    modelsDev: { deepinfra: { models: { "Qwen/Qwen3.8-27B": { id: "Qwen/Qwen3.8-27B", limit: { context: 262144, output: 65536 }, modalities: { input: ["text", "image"] } } } } },
  });
  const suggestion = suggestFromExternal(ROUTE_LOCAL, { id: "qwen3.8-27b" }, index);
  assert.equal(suggestion.capacities.contextWindow, 262144);
  assert.equal(suggestion.capacities.maxTokens, 65536);
  assert.deepEqual(suggestion.capacities.input, ["text", "image"]);
  assert.equal(suggestion.capacities.source, "external");
});
test("同名条目的容量与档位跨源合并（不整条覆盖）", () => {
  const index = buildExternalIndex({
    openrouter: { data: [{ id: "mix-model-9", context_length: 100, top_provider: { max_completion_tokens: 10 }, reasoning: { supported_efforts: ["high"] } }] },
    litellm: { "mix-model-9": { max_input_tokens: 200, supports_vision: true } },
  });
  const hit = index.get("mix model 9");
  assert.equal(hit.contextWindow, 100); // openrouter 排名更高
  assert.equal(hit.input[1], "image");   // 模态只有 litellm 给了
});
test("知识库兜底容量：无外部命中时用家族值", () => {
  const suggestion = buildSuggestion({ route: ROUTE_LOCAL, model: { id: "k3" }, externalIndex: new Map() });
  assert.equal(suggestion.source, "knowledge");
  assert.equal(suggestion.capacities.contextWindow, 1048576);
  assert.deepEqual(suggestion.capacities.input, ["text"]);
});
test("容量建议优先级：网关 > 外部 > 知识库", () => {
  const index = buildExternalIndex({ modelsDev: { p: { models: { "deepseek v4 1 flash": { id: "deepseek-v4.1-flash", limit: { context: 999 } } } } } });
  const fromGateway = capacitySuggestionFor(ROUTE_LOCAL, { id: "deepseek-v4.1-flash" }, index, { id: "deepseek-v4.1-flash", context_length: 111 });
  assert.equal(fromGateway.contextWindow, 111);
  assert.equal(fromGateway.source, "gateway");
  const fromExternal = capacitySuggestionFor(ROUTE_LOCAL, { id: "deepseek-v4.1-flash" }, index, undefined);
  assert.equal(fromExternal.contextWindow, 999);
  assert.equal(fromExternal.source, "external");
  const fromKnowledge = capacitySuggestionFor(ROUTE_LOCAL, { id: "k3" }, new Map(), undefined);
  assert.equal(fromKnowledge.source, "knowledge");
});

if (process.exitCode === undefined) console.log("\ntest-thinking: 全部 " + passed + " 项通过");
else console.error("\ntest-thinking: 有失败项");
