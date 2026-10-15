/**
 * 客户端草稿逻辑单测。
 *
 * 浏览器 bundle 不能被 node 直接渲染，但它内部那套"草稿 → reasoningEfforts"
 * 的转换是会不会写坏配置的关键，所以用最小 react 垫片把 bundle 加载起来，
 * 只测导出的纯函数（exports.__test）。
 *
 * 运行：node test-client.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let captured;
globalThis.window = {
  __ModuleLoader__: {
    load: (definition) => {
      captured = definition;
    },
  },
};

const reactShim = {
  createElement: (...args) => ({ args }),
  useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
};

// 加载 bundle（顶层会调用 window.__ModuleLoader__.load）
const source = readFileSync(new URL("./lib/client.js", import.meta.url), "utf8");
// eslint-disable-next-line no-eval
(0, eval)(source);

assert.ok(captured !== undefined, "bundle 没有调用 __ModuleLoader__.load");
assert.equal(captured.id, "dsh-llm-pi-ai-headers");

const moduleExports = captured.factory((name) => {
  if (name === "react") return reactShim;
  throw new Error("unexpected require: " + name);
});
const t = moduleExports.__test;
assert.ok(t !== undefined, "bundle 没有导出 __test");

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

const PROFILE = {
  models: [
    { id: "a", name: "A" },
    { id: "b", reasoningEfforts: false },
    { id: "c", reasoningEfforts: { off: "none", high: "high" } },
    { id: "d", reasoningEfforts: {}, compat: { thinkingFormat: "zai" } },
    { id: "e", contextWindow: 262144, maxTokens: 65536, input: ["text", "image"] },
  ],
};

console.log("声明状态读回（三态）");
test("未声明 → inherit", () => assert.equal(t.declaredStateOf(PROFILE.models[0]).mode, "inherit"));
test("false → off", () => assert.equal(t.declaredStateOf(PROFILE.models[1]).mode, "off"));
test("字典 → custom", () => assert.equal(t.declaredStateOf(PROFILE.models[2]).mode, "custom"));
test("空字典视为未声明（官方 schema 不接受空梯子）", () => assert.equal(t.declaredStateOf(PROFILE.models[3]).mode, "inherit"));

console.log("由 profile 生成草稿行");
test("行数与模型一致，且带出 declaredCompat", () => {
  const rows = t.thinkingRowsOf(PROFILE);
  assert.equal(rows.length, PROFILE.models.length);
  assert.deepEqual(rows[3].declaredCompat, { thinkingFormat: "zai" });
  assert.deepEqual(rows[2].levels, { off: "none", high: "high" });
});

console.log("建议合并（只预填未声明的行）");
test("未声明的行被预填，已声明的行不动", () => {
  const rows = t.thinkingRowsOf(PROFILE);
  const merged = t.withSuggestions(rows, {
    models: [
      { id: "a", suggestion: { efforts: { off: null, high: "high" }, compat: { supportsDeveloperRole: false } } },
      { id: "c", suggestion: { efforts: { off: "none", high: "high", max: "max" } } },
    ],
  });
  assert.equal(merged[0].mode, "custom");
  assert.equal(merged[0].prefilled, true);
  assert.deepEqual(merged[0].levels, { off: null, high: "high" });
  assert.equal(merged[2].mode, "custom");
  assert.equal(merged[2].prefilled, false);
  assert.deepEqual(merged[2].levels, { off: "none", high: "high" });
});
test("用户动过的行不再被建议覆盖", () => {
  const rows = t.thinkingRowsOf(PROFILE).map((row) => (row.id === "a" ? { ...row, touched: true, mode: "off" } : row));
  const merged = t.withSuggestions(rows, { models: [{ id: "a", suggestion: { efforts: { high: "high" } } }] });
  assert.equal(merged[0].mode, "off");
});

console.log("草稿 → reasoningEfforts");
test("off 留空归一为 null（=不传参数）", () => {
  assert.deepEqual(t.ladderOfRow({ levels: { off: "", high: "high" } }), { off: null, high: "high" });
});
test("off 有值则保留", () => {
  assert.deepEqual(t.ladderOfRow({ levels: { off: "none", high: "high" } }), { off: "none", high: "high" });
});
test("非 off 档空值被丢弃（官方 schema 会拒空串）", () => {
  assert.deepEqual(t.ladderOfRow({ levels: { high: "  ", low: "low" } }), { low: "low" });
});

console.log("落盘前校验");
test("合法梯子通过", () => assert.equal(t.ladderIsSendable({ off: null, high: "high" }), true));
test("只有 off 被拒", () => assert.equal(t.ladderIsSendable({ off: "none" }), false));
test("空对象被拒", () => assert.equal(t.ladderIsSendable({}), false));
test("非 off 档空串被拒", () => assert.equal(t.ladderIsSendable({ high: "" }), false));

console.log("改动判定（决定是否写盘）");
test("模式变化算改动", () => {
  assert.equal(t.rowChanged({ mode: "off", declaredMode: "inherit", levels: {} }), true);
});
test("档位相同不算改动", () => {
  assert.equal(t.rowChanged({ mode: "custom", declaredMode: "custom", levels: { off: "none", high: "high" }, declaredEfforts: { off: "none", high: "high" } }), false);
});
test("off 的 '' 与 null 视为等价（不产生无意义写入）", () => {
  assert.equal(t.rowChanged({ mode: "custom", declaredMode: "custom", levels: { off: "", high: "high" }, declaredEfforts: { off: null, high: "high" } }), false);
});
test("档位值变化算改动", () => {
  assert.equal(t.rowChanged({ mode: "custom", declaredMode: "custom", levels: { off: "", high: "ultra" }, declaredEfforts: { off: null, high: "high" } }), true);
});
test("新增档位算改动", () => {
  assert.equal(t.rowChanged({ mode: "custom", declaredMode: "custom", levels: { off: null, high: "high", max: "max" }, declaredEfforts: { off: null, high: "high" } }), true);
});

console.log("compat 合并语义");
test("只补键，不删已有键", () => {
  assert.deepEqual(t.mergeCompatPatch({ custom: 1 }, { thinkingFormat: "openai", supportsDeveloperRole: false }), {
    custom: 1,
    thinkingFormat: "openai",
    supportsDeveloperRole: false,
  });
});
test("无变化返回 undefined（不写盘）", () => {
  assert.equal(t.mergeCompatPatch({ thinkingFormat: "openai" }, { thinkingFormat: "openai" }), undefined);
});
test("没有建议时不改 compat", () => {
  assert.equal(t.mergeCompatPatch({ a: 1 }, undefined), undefined);
});

console.log("桥响应解析（用户实际踩到的坑：host 半边未重启 → 404 纯文本）");
const fakeResponse = (status, body) => ({ status, text: async () => body });
await (async () => {
  const notFound = await t.readBridgeJson(fakeResponse(404, "not found"));
  assert.equal(notFound.ok, false);
  assert.equal(notFound.code, "bridge-not-loaded");
  assert.match(notFound.message, /HTTP 404/);
  const html = await t.readBridgeJson(fakeResponse(502, "<html>bad gateway</html>"));
  assert.equal(html.ok, false);
  assert.equal(html.code, "bridge-bad-response");
  const good = await t.readBridgeJson(fakeResponse(200, '{"ok":true,"value":{"a":1}}'));
  assert.equal(good.ok, true);
  assert.equal(good.value.a, 1);
  passed += 3;
  console.log("  ✓ 404/502 纯文本降级为结构化失败，正常 JSON 照常解析");
})();

console.log("容量与支持类型（contextWindow / maxTokens / input）");
test("草稿行带出已声明的容量，未声明的为空串/默认 text", () => {
  const rows = t.thinkingRowsOf(PROFILE);
  assert.equal(rows[4].contextWindow, "262144");
  assert.equal(rows[4].maxTokens, "65536");
  assert.deepEqual(rows[4].input, ["text", "image"]);
  assert.equal(rows[0].contextWindow, "");
  assert.deepEqual(rows[0].input, ["text"]);
});
test("容量预填只填未声明的项，已声明的不动", () => {
  const rows = t.thinkingRowsOf(PROFILE);
  const merged = t.withSuggestions(rows, {
    models: [
      { id: "a", capacitySuggestion: { contextWindow: 1000000, maxTokens: 128000, input: ["text", "image"], source: "external" } },
      { id: "e", capacitySuggestion: { contextWindow: 999, source: "external" } },
    ],
  });
  assert.equal(merged[0].contextWindow, "1000000");
  assert.equal(merged[0].maxTokens, "128000");
  assert.deepEqual(merged[0].input, ["text", "image"]);
  assert.equal(merged[0].prefilledCapacity, true);
  // e 已经声明过 262144 / 65536 → 不被 999 覆盖
  assert.equal(merged[4].contextWindow, "262144");
  assert.equal(merged[4].maxTokens, "65536");
});
test("端点只给容量不给档位时，只预填容量不碰档位", () => {
  const rows = t.thinkingRowsOf(PROFILE);
  const merged = t.withSuggestions(rows, {
    models: [{ id: "a", suggestion: { efforts: undefined, source: "gateway" }, capacitySuggestion: { contextWindow: 4096, source: "gateway" } }],
  });
  assert.equal(merged[0].contextWindow, "4096");
  assert.equal(merged[0].mode, "inherit");
  assert.deepEqual(merged[0].levels, {});
});
test("容量文本解析：空串/非法/负数 → undefined（不写）", () => {
  assert.equal(t.capacityNumber(""), undefined);
  assert.equal(t.capacityNumber("   "), undefined);
  assert.equal(t.capacityNumber("abc"), undefined);
  assert.equal(t.capacityNumber("-5"), undefined);
  assert.equal(t.capacityNumber("0"), undefined);
  assert.equal(t.capacityNumber("262144"), 262144);
  assert.equal(t.capacityNumber("131072.9"), 131072);
});
test("容量改动判定：三项任一变化即算改动", () => {
  const base = { contextWindow: "100", maxTokens: "10", input: ["text"], declaredContextWindow: 100, declaredMaxTokens: 10, declaredInput: ["text"] };
  assert.equal(t.capacityChanged(base), false);
  assert.equal(t.capacityChanged({ ...base, contextWindow: "200" }), true);
  assert.equal(t.capacityChanged({ ...base, maxTokens: "20" }), true);
  assert.equal(t.capacityChanged({ ...base, input: ["text", "image"] }), true);
  assert.equal(t.capacityChanged({ ...base, contextWindow: "" }), true);
});
test("未声明的 input 视为 [text]（不产生无意义写入）", () => {
  const row = { contextWindow: "", maxTokens: "", input: ["text"], declaredContextWindow: undefined, declaredMaxTokens: undefined, declaredInput: undefined };
  assert.equal(t.capacityChanged(row), false);
});
test("rowChanged 会因容量变化而触发（保存按钮才会亮）", () => {
  const row = { mode: "inherit", declaredMode: "inherit", levels: {}, contextWindow: "1000", maxTokens: "", input: ["text"], declaredContextWindow: undefined, declaredMaxTokens: undefined, declaredInput: undefined };
  assert.equal(t.rowChanged(row), true);
  assert.equal(t.rowChanged({ ...row, contextWindow: "", declaredContextWindow: undefined }), false);
});

if (process.exitCode === undefined) console.log("\ntest-client: 全部 " + passed + " 项通过");
else console.error("\ntest-client: 有失败项");
