window.__ModuleLoader__.load({
  id: "dsh-llm-pi-ai-headers",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    let react = require("react");
    const h = react.createElement;

    //#region styles
    const css = [
      ".dshlph-section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}",
      ".dshlph-title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:600;line-height:24px}",
      ".dshlph-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}",
      ".dshlph-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;min-width:0;margin-bottom:8px;padding:14px 16px;overflow:hidden}",
      ".dshlph-card-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:22px;margin:0 0 4px}",
      ".dshlph-card-hint{color:var(--dsw-alias-label-tertiary);margin:0 0 10px;font-size:12px;line-height:18px}",
      ".dshlph-field{flex-direction:column;gap:5px;min-width:0;display:flex}",
      ".dshlph-label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}",
      ".dshlph-subtitle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px;margin:12px 0 6px}",
      ".dshlph-select{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:8px;padding:6px 10px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%;max-width:240px;box-sizing:border-box}",
      ".dshlph-input{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:8px;padding:6px 10px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%;box-sizing:border-box}",
      ".dshlph-input:focus,.dshlph-select:focus{border-color:var(--dsw-alias-brand-primary);outline:none}",
      ".dshlph-row{display:grid;grid-template-columns:1fr 1.6fr auto;gap:6px;align-items:center}",
      ".dshlph-keyrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}",
      ".dshlph-keyrow .dshlph-input{min-width:0;width:auto}",
      ".dshlph-keyrow .dshlph-del{white-space:nowrap;flex:none}",
      ".dshlph-codes{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}",
      ".dshlph-code-label{cursor:pointer;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);transition:border-color .13s,background-color .13s;user-select:none}",
      ".dshlph-code-label:hover{border-color:var(--dsw-alias-label-dimmed)}",
      ".dshlph-code-label:has(.dshlph-code-check:checked){border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-interactive-bg-hover)}",
      ".dshlph-code-check{accent-color:var(--dsw-alias-brand-primary)}",
      ".dshlph-backoff{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}",
      ".dshlph-code-bad{border-color:var(--dsw-alias-state-error-primary)!important;background:var(--dsw-alias-interactive-bg-hover-danger,rgba(255,0,0,.06))}",
      ".dshlph-add{font:inherit;cursor:pointer;border-radius:8px;padding:5px 12px;font-size:13px;background:0 0;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);align-self:flex-start}",
      ".dshlph-add:hover{border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary)}",
      ".dshlph-del{font:inherit;cursor:pointer;border-radius:8px;padding:5px 10px;font-size:13px;background:0 0;border:1px solid transparent;color:var(--dsw-alias-state-error-primary)}",
      ".dshlph-del:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}",
      ".dshlph-footer{justify-content:flex-end;align-items:center;gap:8px;display:flex;margin-top:14px}",
      ".dshlph-failed{color:var(--dsw-alias-state-error-primary);margin:0 auto 0 0;font-size:12px}",
      ".dshlph-btn{font:inherit;cursor:pointer;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:500;transition:background-color .13s,border-color .13s,color .13s,opacity .13s}",
      ".dshlph-save{border:1px solid var(--dsw-alias-button-info-fill);background:var(--dsw-alias-button-info-fill);color:var(--dsw-alias-label-primary-foreground)}",
      ".dshlph-save:hover:not(:disabled){border-color:var(--dsw-alias-button-info-hover);background:var(--dsw-alias-button-info-hover)}",
      ".dshlph-btn:disabled{opacity:.5;cursor:default}",
      ".dshlph-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;margin:0}",
      ".dshlph-divider{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:14px 0}",
      ".dshlph-code-badge{display:inline-block;font-family:var(--ds-font-family-code);font-size:11px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l3);border-radius:4px;padding:0 4px;margin-left:6px}",
      // ── 思考强度（模型级）──
      ".dshlph-th-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:2px 0 10px}",
      ".dshlph-th-status{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
      ".dshlph-th-list{display:flex;flex-direction:column;gap:8px}",
      ".dshlph-th-row{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1)}",
      ".dshlph-th-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px}",
      ".dshlph-th-id{font-family:var(--ds-font-family-code);font-size:12px;color:var(--dsw-alias-label-primary);word-break:break-all;flex:1 1 auto;min-width:120px}",
      ".dshlph-th-badge{font-size:11px;line-height:16px;border-radius:4px;padding:0 5px;border:1px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".dshlph-th-badge-on{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}",
      ".dshlph-th-badge-warn{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}",
      ".dshlph-th-mode{font:inherit;font-size:12px;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:3px 6px;flex:none}",
      ".dshlph-th-levels{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;margin-top:8px}",
      ".dshlph-th-wires{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:8px}",
      ".dshlph-th-wire{display:flex;align-items:center;gap:5px}",
      ".dshlph-th-wire span{font-size:11px;color:var(--dsw-alias-label-tertiary);min-width:44px}",
      ".dshlph-th-wire input{flex:1;min-width:0}",
      ".dshlph-th-note{margin:6px 0 0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}",
      ".dshlph-th-mini{font:inherit;cursor:pointer;font-size:11px;border-radius:6px;padding:2px 8px;background:0 0;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}",
      ".dshlph-th-mini:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary)}",
      ".dshlph-th-mini:disabled{opacity:.5;cursor:default}",
      ".dshlph-th-prefilled{border-color:var(--dsw-alias-brand-primary)}",
      ".dshlph-th-cap{margin-top:8px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l3)}",
      ".dshlph-th-caphead{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:6px}",
      ".dshlph-th-capgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end}",
      ".dshlph-th-capfield{display:flex;flex-direction:column;gap:4px;min-width:0}",
      ".dshlph-th-capfield>span{font-size:11px;color:var(--dsw-alias-label-tertiary)}",
      ".dshlph-th-captypes{display:flex;gap:6px;flex-wrap:wrap}",
    ].join("");
    const tagId = "dsh-llm-pi-ai-headers/section.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-llm-pi-ai-headers";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    //#endregion

    const BRIDGE_PREFIX = "/api/dsh-llm-pi-ai-headers";
    const NS = "llm-pi-ai";
    const isZh = typeof navigator !== "undefined" && (/^zh\b/i.test(navigator.language || "") || /^zh-/i.test(navigator.language || ""));

    const title = isZh ? "模型扩展" : "Model Extensions";
    const description = isZh
      ? "按提供商配置请求头、失败重试策略与各模型的思考强度。User-Agent 会被官方适配器过滤，由本插件在请求层补回；其他请求头与 retryPolicy 官方原样生效；思考强度写的是官方 llm-pi-ai 的模型级 reasoningEfforts / compat 字段。"
      : "Configure per-provider request headers, retry policy, and per-model thinking effort. User-Agent is filtered by the official adapter and re-injected by this plugin; other headers and retryPolicy are honored as-is; thinking effort writes the official per-model reasoningEfforts / compat fields.";
    const emptyProviders = isZh
      ? "还没有已配置的提供商。请先在「模型」页添加提供商，再回来编辑请求头与重试策略。"
      : "No providers configured yet. Add one in the Models page first, then edit headers and retry policy here.";

    // ── 思考强度（reasoning effort）──
    // 档位全集与官方 dsh-llm-pi-ai 的 THINKING_LEVELS 一致。
    const TH_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
    const TH_MODE = { INHERIT: "inherit", OFF: "off", CUSTOM: "custom" };
    const TH_SOURCE_LABEL = {
      gateway: isZh ? "网关探测" : "gateway",
      external: isZh ? "外部目录" : "external",
      knowledge: isZh ? "内置知识库" : "knowledge",
    };
    const TH_CONFIDENCE_LABEL = { high: isZh ? "高" : "high", medium: isZh ? "中" : "medium", low: isZh ? "低" : "low" };
    const TH = {
      title: isZh ? "思考强度（模型级）" : "Thinking effort (per model)",
      hint: isZh
        ? "为每个模型声明可选推理档位，模型选择器里就会出现对应的档位菜单。档位写的是发送给该网关的线上写法（例如 off 留空=不传参数，填 none=发送 reasoning_effort:none）。"
        : "Declare each model's selectable reasoning levels; the composer's model picker then offers them. A level's value is the wire spelling sent to this gateway (leave off empty to send nothing, or type none to send reasoning_effort: none).",
      autoDetect: isZh ? "自动识别本提供商" : "Auto-detect this provider",
      detecting: isZh ? "识别中…" : "Detecting…",
      refreshCatalog: isZh ? "更新外部目录" : "Refresh external catalog",
      refreshing: isZh ? "拉取中…" : "Fetching…",
      catalogNever: isZh ? "外部目录：未下载" : "External catalog: not downloaded",
      modeInherit: isZh ? "不配置（继承）" : "Unset (inherit)",
      modeOff: isZh ? "不支持推理" : "No reasoning",
      modeCustom: isZh ? "自定义档位" : "Custom levels",
      applySuggestion: isZh ? "用建议填充" : "Fill from suggestion",
      currentInherit: isZh ? "当前：未声明" : "current: unset",
      currentOff: isZh ? "当前：不支持推理" : "current: no reasoning",
      currentCustom: isZh ? "当前：已声明" : "current: declared",
      prefilled: isZh ? "已预填，保存后生效" : "prefilled — save to apply",
      noSuggestion: isZh ? "无建议（可手写）" : "no suggestion (edit manually)",
      invalid: isZh ? "档位不合法：至少勾一个思考档，且非 off 档必须填写线上写法" : "Invalid: pick at least one thinking level, and every non-off level needs a wire value",
      noModels: isZh ? "该提供商没有显式声明的模型列表，无法按模型配置档位。" : "This provider declares no explicit model list, so per-model levels are unavailable.",
      matched: isZh ? "匹配" : "matched",
      offHint: isZh ? "留空 = 不传参数" : "empty = send nothing",
      // ── 容量 / 支持类型 ──
      capacityTitle: isZh ? "上下文长度 / 最大输出 / 支持类型" : "Context window / max output / input types",
      contextWindow: isZh ? "上下文长度" : "Context window",
      maxTokens: isZh ? "最大输出" : "Max output",
      inputTypes: isZh ? "支持类型" : "Input types",
      inputText: isZh ? "文本" : "Text",
      inputImage: isZh ? "图片" : "Image",
      capacityEmpty: isZh ? "留空 = 不声明（用官方默认）" : "Empty = unset (adapter default)",
      capacityFilled: isZh ? "已按识别结果预填" : "prefilled from detection",
      capacityNumberInvalid: isZh ? "请填正整数" : "positive integer only",
    };

    const DEFAULT_RETRY = Object.freeze({
      mode: "normal",
      maxRetries: 2,
      retryableCodes: ["RATE_LIMIT", "SERVER", "TIMEOUT", "TRANSPORT", "EMPTY_RESPONSE"],
      backoff: Object.freeze({ initialDelayMs: 500, maxDelayMs: 10000, jitterRatio: 0.1 }),
    });
    const RETRY_CODE_OPTIONS = [
      { code: "RATE_LIMIT", zh: "限流", en: "Rate limit" },
      { code: "SERVER", zh: "服务端错误", en: "Server error" },
      { code: "TIMEOUT", zh: "超时", en: "Timeout" },
      { code: "TRANSPORT", zh: "传输错误", en: "Transport error" },
      { code: "EMPTY_RESPONSE", zh: "空响应", en: "Empty response" },
      { code: "QUOTA", zh: "配额超限", en: "Quota exceeded" },
    ];
    const RETRY_CODE_OPTION_KEYS = new Set(RETRY_CODE_OPTIONS.map((option) => option.code));

    let rowSeed = 0;
    function newRow(key, value) {
      return { id: ++rowSeed + "-" + Math.random().toString(36).slice(2), key: key || "", value: value || "" };
    }

    function dictToRows(obj) {
      const source = obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
      return Object.keys(source).map((key) => newRow(key, String(source[key] ?? "")));
    }

    function rowsToDict(rows) {
      const out = {};
      for (const row of rows || []) {
        const key = String(row.key || "").trim();
        if (key) out[key] = String(row.value ?? "");
      }
      return out;
    }

    // ---- key pool helpers ----
    let keyPoolSeed = 0;
    function newKeyRow(value) {
      return { id: ++keyPoolSeed + "-" + Math.random().toString(36).slice(2), value: value || "" };
    }
    function keyRowsToList(rows) {
      return rows.map((r) => String(r.value ?? "")).filter((v) => v.trim().length > 0);
    }
    function listToKeyRows(list) {
      return (Array.isArray(list) ? list : []).map((v) => newKeyRow(String(v)));
    }

    // ---- retry policy helpers ----
    function retryFromProfile(profile) {
      const p = profile && typeof profile === "object" ? profile.retryPolicy : undefined;
      if (p === undefined) return { mode: DEFAULT_RETRY.mode, maxRetries: DEFAULT_RETRY.maxRetries, retryableCodes: [...DEFAULT_RETRY.retryableCodes], backoff: { ...DEFAULT_RETRY.backoff } };
      const backoff = { ...DEFAULT_RETRY.backoff, ...(p.backoff && typeof p.backoff === "object" ? p.backoff : {}) };
      if (p.mode === "always") return { mode: "always", maxRetries: DEFAULT_RETRY.maxRetries, retryableCodes: [...DEFAULT_RETRY.retryableCodes], backoff };
      return {
        mode: "normal",
        maxRetries: Number.isSafeInteger(p.maxRetries) && p.maxRetries >= 0 ? p.maxRetries : DEFAULT_RETRY.maxRetries,
        retryableCodes: Array.isArray(p.retryableCodes) && p.retryableCodes.length > 0 ? p.retryableCodes.map(String) : [...DEFAULT_RETRY.retryableCodes],
        backoff,
      };
    }

    function retryToValue(state) {
      if (state.mode === "always") {
        return { mode: "always", backoff: { ...state.backoff } };
      }
      return {
        mode: "normal",
        maxRetries: state.maxRetries,
        retryableCodes: state.retryableCodes.filter((code) => code.length > 0),
        backoff: { ...state.backoff },
      };
    }

    function retryIsDefault(state) {
      if (state.mode !== DEFAULT_RETRY.mode) return false;
      if (state.maxRetries !== DEFAULT_RETRY.maxRetries) return false;
      if (state.retryableCodes.length !== DEFAULT_RETRY.retryableCodes.length) return false;
      for (let i = 0; i < state.retryableCodes.length; i += 1) {
        if (state.retryableCodes[i] !== DEFAULT_RETRY.retryableCodes[i]) return false;
      }
      return state.backoff.initialDelayMs === DEFAULT_RETRY.backoff.initialDelayMs
        && state.backoff.maxDelayMs === DEFAULT_RETRY.backoff.maxDelayMs
        && state.backoff.jitterRatio === DEFAULT_RETRY.backoff.jitterRatio;
    }

    /**
     * 读一个桥响应的 JSON。
     *
     * 桥路由没注册时（典型场景：客户端 bundle 已从磁盘热更新，但 host 半边
     * 还没随进程重启），服务端兜底返回的是纯文本 `not found`——直接
     * `response.json()` 会抛 `Unexpected token 'o', "not found" ...`，
     * 用户看到的是一句莫名其妙的解析错误。这里统一降级成结构化失败。
     */
    async function readBridgeJson(response) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        const snippet = String(text).trim().slice(0, 120);
        return {
          ok: false,
          code: response.status === 404 ? "bridge-not-loaded" : "bridge-bad-response",
          status: response.status,
          message: `HTTP ${response.status}${snippet.length > 0 ? " · " + snippet : ""}`,
        };
      }
    }

    async function bridgeDescribe() {
      const response = await fetch(`${BRIDGE_PREFIX}/describe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      return readBridgeJson(response);
    }

    async function bridgeMutate(payload) {
      const response = await fetch(`${BRIDGE_PREFIX}/mutate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      return readBridgeJson(response);
    }

    async function bridgeThinking(action, payload) {
      const response = await fetch(`${BRIDGE_PREFIX}/thinking/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
      return readBridgeJson(response);
    }

    // ── 思考强度：草稿模型 ────────────────────────────────────────────────
    // 与 host 的 plugin/thinking.mjs 保持同一套语义，但这里只做"读写草稿"，
    // 真正的识别/推断全部在 host 侧，保证同一份输入只有一种结论。

    /** 读文档里的声明状态（三态）。 */
    function declaredStateOf(model) {
      const declared = model ? model.reasoningEfforts : undefined;
      if (declared === false) return { mode: TH_MODE.OFF, efforts: undefined };
      if (declared === null || typeof declared !== "object" || Array.isArray(declared)) {
        return { mode: TH_MODE.INHERIT, efforts: undefined };
      }
      const levels = TH_LEVELS.filter((level) => Object.prototype.hasOwnProperty.call(declared, level));
      if (levels.length === 0) return { mode: TH_MODE.INHERIT, efforts: undefined };
      return { mode: TH_MODE.CUSTOM, efforts: { ...declared } };
    }

    /** 由 provider profile 生成草稿行（此时还没有建议）。 */
    function thinkingRowsOf(profile) {
      const models = Array.isArray(profile && profile.models) ? profile.models : [];
      return models.map((model) => {
        const state = declaredStateOf(model);
        return {
          id: String(model && model.id !== undefined ? model.id : ""),
          name: typeof (model && model.name) === "string" ? model.name : undefined,
          declaredMode: state.mode,
          declaredEfforts: state.efforts,
          declaredCompat: model && typeof model.compat === "object" && model.compat !== null ? model.compat : undefined,
          // ── 容量 / 支持类型（官方 modelFields 的另外三个字段）──
          // 空串代表"未声明"，与数字/数组区分开，便于判断"要不要写盘"。
          declaredContextWindow: typeof (model && model.contextWindow) === "number" ? model.contextWindow : undefined,
          declaredMaxTokens: typeof (model && model.maxTokens) === "number" ? model.maxTokens : undefined,
          declaredInput: Array.isArray(model && model.input) ? [...model.input] : undefined,
          mode: state.mode,
          levels: state.efforts ? { ...state.efforts } : {},
          contextWindow: typeof (model && model.contextWindow) === "number" ? String(model.contextWindow) : "",
          maxTokens: typeof (model && model.maxTokens) === "number" ? String(model.maxTokens) : "",
          input: Array.isArray(model && model.input) && model.input.length > 0 ? [...model.input] : ["text"],
          suggestion: undefined,
          capacitySuggestion: undefined,
          compatHint: undefined,
          prefilled: false,
          prefilledCapacity: false,
          touched: false,
        };
      });
    }

    /** 把 host 的建议并进草稿行；只对"未声明且用户没动过"的行预填。 */
    function withSuggestions(rows, payload) {
      const byId = new Map(((payload && payload.models) || []).map((row) => [row.id, row]));
      return rows.map((row) => {
        const hit = byId.get(row.id);
        if (hit === undefined) return row;
        const next = { ...row, suggestion: hit.suggestion, capacitySuggestion: hit.capacitySuggestion, compatHint: hit.compatHint };
        // 档位预填：只填"未声明且用户没动过"的行。注意 host 可能只给容量
        // 不给档位（端点没说推理能力），那种行只预填容量，不碰档位。
        if (row.declaredMode === TH_MODE.INHERIT && row.touched !== true && hit.suggestion !== undefined
            && hit.suggestion.efforts !== undefined) {
          next.mode = TH_MODE.CUSTOM;
          next.levels = { ...hit.suggestion.efforts };
          next.prefilled = true;
        }
        // 容量预填：三项各自独立，只填文档里没声明的部分。
        const cap = hit.capacitySuggestion;
        if (cap !== undefined && row.touched !== true) {
          if (row.declaredContextWindow === undefined && cap.contextWindow !== undefined) {
            next.contextWindow = String(cap.contextWindow);
            next.prefilledCapacity = true;
          }
          if (row.declaredMaxTokens === undefined && cap.maxTokens !== undefined) {
            next.maxTokens = String(cap.maxTokens);
            next.prefilledCapacity = true;
          }
          if (row.declaredInput === undefined && cap.input !== undefined) {
            next.input = [...cap.input];
            next.prefilledCapacity = true;
          }
        }
        return next;
      });
    }

    /** 草稿 → 待写入的 reasoningEfforts 值（off 留空归一为 null）。 */
    function ladderOfRow(row) {
      const out = {};
      for (const level of TH_LEVELS) {
        if (!Object.prototype.hasOwnProperty.call(row.levels, level)) continue;
        const raw = row.levels[level];
        const text = raw === undefined || raw === null ? "" : String(raw).trim();
        if (level === "off") out[level] = text.length === 0 ? null : text;
        else if (text.length > 0) out[level] = text;
      }
      return out;
    }

    /** 官方 schema 会不会接受这份梯子（至少一个思考档、非 off 档非空）。 */
    function ladderIsSendable(ladder) {
      const entries = Object.entries(ladder || {});
      if (entries.length === 0) return false;
      if (!entries.some(([level]) => level !== "off")) return false;
      for (const [level, wire] of entries) {
        if (wire === null) {
          if (level !== "off") return false;
          continue;
        }
        if (typeof wire !== "string" || wire.length === 0) return false;
      }
      return true;
    }

    /** 归一化后比较两份梯子是否等价（undefined/null 视为同一种"没写"）。 */
    function sameLadder(left, right) {
      const a = left || {};
      const b = right || {};
      for (const level of TH_LEVELS) {
        const av = Object.prototype.hasOwnProperty.call(a, level) ? a[level] : undefined;
        const bv = Object.prototype.hasOwnProperty.call(b, level) ? b[level] : undefined;
        const an = av === undefined ? null : av;
        const bn = bv === undefined ? null : bv;
        if (an !== bn) return false;
      }
      return true;
    }

    /** 这一行相对文档是否有改动。 */
    function rowChanged(row) {
      if (row.mode !== row.declaredMode) return true;
      if (capacityChanged(row)) return true;
      if (row.mode !== TH_MODE.CUSTOM) return false;
      return !sameLadder(ladderOfRow(row), row.declaredEfforts);
    }

    /** 把输入框里的容量文本解析成正整数；空串/非法值 → undefined（=不写）。 */
    function capacityNumber(text) {
      const trimmed = String(text === undefined || text === null ? "" : text).trim();
      if (trimmed.length === 0) return undefined;
      const value = Number(trimmed);
      if (!Number.isFinite(value)) return undefined;
      const rounded = Math.trunc(value);
      return rounded > 0 ? rounded : undefined;
    }

    /** 容量三项（contextWindow / maxTokens / input）相对文档是否有改动。 */
    function capacityChanged(row) {
      const nextContext = capacityNumber(row.contextWindow);
      if (nextContext !== row.declaredContextWindow) return true;
      const nextMax = capacityNumber(row.maxTokens);
      if (nextMax !== row.declaredMaxTokens) return true;
      const nextInput = Array.isArray(row.input) && row.input.length > 0 ? row.input : ["text"];
      const declared = row.declaredInput === undefined ? ["text"] : row.declaredInput;
      if (nextInput.length !== declared.length) return true;
      for (let i = 0; i < nextInput.length; i += 1) {
        if (nextInput[i] !== declared[i]) return true;
      }
      return false;
    }

    /** 只补键、不删键的 compat 合并（与 host 的 mergeCompat 同语义）。 */
    function mergeCompatPatch(existing, patch) {
      if (patch === undefined || patch === null) return undefined;
      const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
      let changed = false;
      const out = { ...base };
      for (const [key, value] of Object.entries(patch)) {
        if (out[key] === value) continue;
        out[key] = value;
        changed = true;
      }
      return changed ? out : undefined;
    }

    function HeadersSection(props) {
      const [status, setStatus] = react.useState("loading");
      const [providers, setProviders] = react.useState({});
      const [route, setRoute] = react.useState("");
      const [headers, setHeaders] = react.useState([]);
      const [retryState, setRetryState] = react.useState(() => ({ ...DEFAULT_RETRY, backoff: { ...DEFAULT_RETRY.backoff }, retryableCodes: [...DEFAULT_RETRY.retryableCodes] }));
      const [useKeyPool, setUseKeyPool] = react.useState(false);
      const [hasPrimaryKey, setHasPrimaryKey] = react.useState(false);
      const [keyPoolRows, setKeyPoolRows] = react.useState([]);
      const [keyPoolHeaderName, setKeyPoolHeaderName] = react.useState("Authorization");
      const [showKeys, setShowKeys] = react.useState(false);
      const [keyHealth, setKeyHealth] = react.useState(null);
      const lastHealthRef = react.useRef({});
      const [dirty, setDirty] = react.useState(false);
      const [saving, setSaving] = react.useState(false);
      const [failed, setFailed] = react.useState(false);
      // ── 思考强度（模型级）──
      const [thinkingRows, setThinkingRows] = react.useState([]);
      const [thinkingBusy, setThinkingBusy] = react.useState(false);
      const [catalogBusy, setCatalogBusy] = react.useState(false);
      const [thinkingNote, setThinkingNote] = react.useState("");
      const [catalog, setCatalog] = react.useState(null);
      const [thinkingFailed, setThinkingFailed] = react.useState(false);
      const [saveError, setSaveError] = react.useState("");
      // 当前 route 的引用：异步建议回来时若已切换提供商，丢弃该响应。
      const routeRef = react.useRef("");

      const applyProfile = (profile) => {
        setHeaders(dictToRows(profile?.headers));
        setThinkingRows(thinkingRowsOf(profile));
        setThinkingNote("");
        setThinkingFailed(false);
        const next = retryFromProfile(profile);
        setRetryState({ ...next, backoff: { ...next.backoff }, retryableCodes: [...next.retryableCodes] });
        // key pool —— 服务端会把模型页的 apiKeyEnv 主 Key 隐式作为池子 1 号位，
        // 所以只要提供商配了 apiKeyEnv（或已显式配了 keyPool），轮询即视为已启用。
        const pool = profile?.keyPool;
        const explicitKeys = pool && Array.isArray(pool.keys) ? pool.keys : [];
        const primaryKey = typeof profile?.apiKeyEnv === "string" && profile.apiKeyEnv.length > 0;
        const enabled = !(pool && pool.enabled === false) && (primaryKey || explicitKeys.length > 0);
        setHasPrimaryKey(primaryKey);
        setUseKeyPool(enabled);
        setKeyPoolRows(listToKeyRows(explicitKeys));
        setKeyPoolHeaderName(pool && typeof pool.headerName === "string" && pool.headerName.length > 0 ? pool.headerName : "Authorization");
        setDirty(false);
        setFailed(false);
      };

      const load = react.useCallback(async () => {
        try {
          const result = await bridgeDescribe();
          if (result.ok) {
            const view = (result.value.namespaces || []).find((n) => n.ns === NS);
            if (view) {
              const v = view.value ?? {};
              const nextProviders = v.providers ?? {};
              const keys = Object.keys(nextProviders);
              setProviders(nextProviders);
              const current = keys.includes(route) ? route : (keys[0] ?? "");
              routeRef.current = current;
              setRoute(current);
              applyProfile(nextProviders[current]);
              lastHealthRef.current = result.value.keyHealth ?? {};
              setKeyHealth(lastHealthRef.current[current] ?? null);
              setStatus("ready");
              // 建议由 host 计算；打开分节即预填（只填未声明的模型，仍需手动保存）。
              loadThinking(current);
            } else {
              setStatus("unavailable");
            }
          } else {
            setStatus("unavailable");
          }
        } catch {
          setStatus("unavailable");
        }
      }, [route]);

      react.useEffect(() => {
        load();
      }, [load]);

      // ── 思考强度：识别与草稿操作 ──────────────────────────────────────
      // 建议一律由 host 计算（plugin/thinking.mjs），浏览器只负责显示与落盘。

      /** 把桥的失败翻译成用户能看懂的一句话。 */
      const bridgeErrorNote = (result) => {
        if (result !== undefined && result !== null && result.code === "bridge-not-loaded") {
          return isZh
            ? "插件的 host 半边还没加载：新路由要重启 dsh web 才会注册。重启并硬刷新后本功能即可用。"
            : "The plugin's host half is not loaded yet — its new routes register on a dsh web restart. Restart and hard-refresh.";
        }
        if (result !== undefined && result !== null && typeof result.message === "string" && result.message.length > 0) {
          return result.message;
        }
        return isZh ? "请求失败" : "Request failed";
      };

      const loadThinking = async (routeKey) => {
        if (!routeKey) return;
        setThinkingBusy(true);
        setThinkingFailed(false);
        try {
          const result = await bridgeThinking("suggest", { route: routeKey });
          if (result && result.ok && routeRef.current === routeKey) {
            setThinkingNote("");
            setCatalog(result.value.catalog ?? null);
            setThinkingRows((rows) => withSuggestions(rows, result.value));
          } else if (!result || !result.ok) {
            setThinkingNote(bridgeErrorNote(result));
          }
        } catch (error) {
          setThinkingNote(String(error && error.message ? error.message : error));
        } finally {
          setThinkingBusy(false);
        }
      };

      const probeThinking = async () => {
        if (!route) return;
        setThinkingBusy(true);
        setThinkingNote("");
        try {
          const result = await bridgeThinking("probe", { route });
          if (result && result.ok && routeRef.current === route) {
            setCatalog(result.value.catalog ?? null);
            setThinkingRows((rows) => withSuggestions(rows, result.value));
          } else if (!result || !result.ok) {
            setThinkingNote(bridgeErrorNote(result));
          }
        } catch (error) {
          setThinkingNote(String(error && error.message ? error.message : error));
        } finally {
          setThinkingBusy(false);
        }
      };

      const refreshCatalog = async () => {
        setCatalogBusy(true);
        setThinkingNote("");
        try {
          const result = await bridgeThinking("catalog", { action: "refresh" });
          if (result && result.ok) {
            setCatalog(result.value);
            await loadThinking(routeRef.current);
          } else {
            setThinkingNote(bridgeErrorNote(result));
          }
        } catch (error) {
          setThinkingNote(String(error && error.message ? error.message : error));
        } finally {
          setCatalogBusy(false);
        }
      };

      const setRowMode = (id, mode) => {
        setThinkingRows((rows) => rows.map((row) => {
          if (row.id !== id) return row;
          if (mode !== TH_MODE.CUSTOM) return { ...row, mode, touched: true, prefilled: false };
          const levels = Object.keys(row.levels).length > 0
            ? row.levels
            : row.suggestion !== undefined
              ? { ...row.suggestion.efforts }
              : { off: "", high: "high" };
          return { ...row, mode, levels, touched: true, prefilled: false };
        }));
        setThinkingFailed(false);
      };

      const toggleRowLevel = (id, level, checked) => {
        setThinkingRows((rows) => rows.map((row) => {
          if (row.id !== id) return row;
          const levels = { ...row.levels };
          if (checked) {
            if (!Object.prototype.hasOwnProperty.call(levels, level)) {
              levels[level] = level === "off" ? "" : level;
            }
          } else {
            delete levels[level];
          }
          return { ...row, levels, touched: true, prefilled: false };
        }));
        setThinkingFailed(false);
      };

      const setRowWire = (id, level, value) => {
        setThinkingRows((rows) => rows.map((row) => (
          row.id === id
            ? { ...row, levels: { ...row.levels, [level]: value }, touched: true, prefilled: false }
            : row
        )));
        setThinkingFailed(false);
      };

      const setRowCapacity = (id, field, value) => {
        setThinkingRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value, touched: true, prefilledCapacity: false } : row)));
        setThinkingFailed(false);
      };

      const toggleRowInput = (id, value, checked) => {
        setThinkingRows((rows) => rows.map((row) => {
          if (row.id !== id) return row;
          const current = Array.isArray(row.input) && row.input.length > 0 ? row.input : ["text"];
          const next = ["text", "image"].filter((item) => (item === value ? checked : current.includes(item)));
          return { ...row, input: next.length > 0 ? next : ["text"], touched: true, prefilledCapacity: false };
        }));
        setThinkingFailed(false);
      };

      const fillCapacityFromSuggestion = (id) => {
        setThinkingRows((rows) => rows.map((row) => {
          if (row.id !== id || row.capacitySuggestion === undefined) return row;
          const cap = row.capacitySuggestion;
          return {
            ...row,
            contextWindow: cap.contextWindow !== undefined ? String(cap.contextWindow) : row.contextWindow,
            maxTokens: cap.maxTokens !== undefined ? String(cap.maxTokens) : row.maxTokens,
            input: cap.input !== undefined ? [...cap.input] : row.input,
            touched: true,
            prefilledCapacity: false,
          };
        }));
        setThinkingFailed(false);
      };

      const fillFromSuggestion = (id) => {
        setThinkingRows((rows) => rows.map((row) => {
          if (row.id !== id || row.suggestion === undefined) return row;
          return { ...row, mode: TH_MODE.CUSTOM, levels: { ...row.suggestion.efforts }, touched: true, prefilled: false };
        }));
        setThinkingFailed(false);
      };

      const selectRoute = (value) => {
        routeRef.current = value;
        setRoute(value);
        applyProfile(providers[value]);
        // 健康数据随路由切换一并刷新（bridgeDescribe 一次性带回全部路由）。
        setKeyHealth((lastHealthRef.current ?? {})[value] ?? null);
        // 思考强度：切换提供商后重新取建议（host 侧只读缓存，不联网）。
        loadThinking(value);
      };

      const updateRow = (id, field, value) => {
        setHeaders((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
        setDirty(true);
        setFailed(false);
      };

      const removeRow = (id) => {
        setHeaders((rows) => rows.filter((row) => row.id !== id));
        setDirty(true);
        setFailed(false);
      };

      const addRow = () => {
        setHeaders((rows) => [...rows, newRow("", "")]);
        setDirty(true);
        setFailed(false);
      };

      // ---- key pool row operations ----
      const toggleKeyPool = (on) => {
        setUseKeyPool(on);
        setDirty(true);
        setFailed(false);
      };
      const updateKeyRow = (id, value) => {
        setKeyPoolRows((rows) => rows.map((r) => (r.id === id ? { ...r, value } : r)));
        setDirty(true);
        setFailed(false);
      };
      const removeKeyRow = (id) => {
        setKeyPoolRows((rows) => rows.filter((r) => r.id !== id));
        setDirty(true);
        setFailed(false);
      };
      const addKeyRow = () => {
        setKeyPoolRows((rows) => [...rows, newKeyRow("")]);
        setDirty(true);
        setFailed(false);
      };

      const patchRetry = (patch) => {
        setRetryState((prev) => ({ ...prev, ...patch }));
        setDirty(true);
        setFailed(false);
      };

      const resetRetry = () => {
        setRetryState({ ...DEFAULT_RETRY, backoff: { ...DEFAULT_RETRY.backoff }, retryableCodes: [...DEFAULT_RETRY.retryableCodes] });
        setDirty(true);
        setFailed(false);
      };

      const save = async () => {
        if (!route) return;
        setSaving(true);
        setFailed(false);
        setSaveError("");
        try {
          const currentProfile = providers[route] ?? {};
          const ops = [];
          const headersValue = rowsToDict(headers);
          if (Object.keys(headersValue).length > 0 || currentProfile.headers !== undefined) {
            ops.push({ op: "set", path: ["providers", route, "headers"], value: headersValue });
          } else {
            ops.push({ op: "unset", path: ["providers", route, "headers"] });
          }
          if (retryIsDefault(retryState)) {
            ops.push({ op: "unset", path: ["providers", route, "retryPolicy"] });
          } else {
            ops.push({ op: "set", path: ["providers", route, "retryPolicy"], value: retryToValue(retryState) });
          }
          // key pool —— 注意 enabled 语义：模型页有 apiKeyEnv 时服务端默认启用
          // 轮询（主 Key 是隐式 1 号位），所以取消勾选必须写 enabled:false 来
          // 显式关闭，而不是 unset（unset = 回到默认 = 启用）。
          const keyPoolProfileHasKey = typeof providers[route]?.apiKeyEnv === "string" && providers[route].apiKeyEnv.length > 0;
          const keys = [...new Set(keyRowsToList(keyPoolRows))];
          const headerName = keyPoolHeaderName.trim() || "Authorization";
          if (useKeyPool) {
            if (keyPoolProfileHasKey || keys.length > 0) {
              ops.push({ op: "set", path: ["providers", route, "keyPool"], value: { enabled: true, headerName, keys } });
            } else {
              ops.push({ op: "unset", path: ["providers", route, "keyPool"] });
            }
          } else {
            // 保留 keys，重新勾选时不用重填
            ops.push({ op: "set", path: ["providers", route, "keyPool"], value: { enabled: false, headerName, keys } });
          }
          // ── 思考强度：逐模型写入 reasoningEfforts（必要时并补 compat）──
          // 只写改动过的模型；未改动的模型一个字节都不碰。
          const modelList = Array.isArray(currentProfile.models) ? currentProfile.models : [];
          for (const row of thinkingRows) {
            if (!rowChanged(row)) continue;
            const index = modelList.findIndex((model) => model !== null && typeof model === "object" && model.id === row.id);
            if (index < 0) continue;
            const base = ["providers", route, "models", index];
            if (row.mode === TH_MODE.INHERIT) {
              ops.push({ op: "unset", path: [...base, "reasoningEfforts"] });
              continue;
            }
            if (row.mode === TH_MODE.OFF) {
              ops.push({ op: "set", path: [...base, "reasoningEfforts"], value: false });
              continue;
            }
            const ladder = ladderOfRow(row);
            if (!ladderIsSendable(ladder)) {
              setThinkingFailed(true);
              setSaving(false);
              return;
            }
            ops.push({ op: "set", path: [...base, "reasoningEfforts"], value: ladder });
            // compat 只补键不删键：thinkingFormat / supportsReasoningEffort /
            // 非官方域名的 supportsDeveloperRole:false —— 少了它，模型一旦
            // 声明 reasoning，系统提示词 role 就会从 system 变 developer。
            const hint = row.suggestion !== undefined && row.suggestion.compat !== undefined
              ? row.suggestion.compat
              : row.compatHint;
            const merged = mergeCompatPatch(row.declaredCompat, hint);
            if (merged !== undefined) {
              ops.push({ op: "set", path: [...base, "compat"], value: merged });
            }
          }
          // ── 容量 / 支持类型：同样是模型级字段，逐项只写有变化的 ──
          for (const row of thinkingRows) {
            const index = modelList.findIndex((model) => model !== null && typeof model === "object" && model.id === row.id);
            if (index < 0) continue;
            const base = ["providers", route, "models", index];
            const nextContext = capacityNumber(row.contextWindow);
            if (nextContext !== row.declaredContextWindow) {
              ops.push(nextContext === undefined
                ? { op: "unset", path: [...base, "contextWindow"] }
                : { op: "set", path: [...base, "contextWindow"], value: nextContext });
            }
            const nextMax = capacityNumber(row.maxTokens);
            if (nextMax !== row.declaredMaxTokens) {
              ops.push(nextMax === undefined
                ? { op: "unset", path: [...base, "maxTokens"] }
                : { op: "set", path: [...base, "maxTokens"], value: nextMax });
            }
            // 模态永远不为空：空集在官方 schema 里是合法数组但语义怪异，
            // 所以取消勾选 image 后收敛为 ["text"]（官方默认值）。
            const nextInput = Array.isArray(row.input) && row.input.length > 0 ? row.input : ["text"];
            const declared = row.declaredInput === undefined ? ["text"] : row.declaredInput;
            const same = nextInput.length === declared.length && nextInput.every((item, i) => item === declared[i]);
            if (!same) ops.push({ op: "set", path: [...base, "input"], value: nextInput });
          }
          const result = await bridgeMutate({ ns: NS, ops });
          if (result.ok) {
            setDirty(false);
            setFailed(false);
            setSaveError("");
            await load();
          } else if (result.code === "bridge-not-loaded" || result.code === "bridge-bad-response") {
            // 桥没注册（host 半边未随进程重启）时，别把它说成"官方校验拒绝"。
            setSaveError(bridgeErrorNote(result));
          } else {
            setFailed(true);
          }
        } catch (error) {
          setSaveError(String(error && error.message ? error.message : error));
        } finally {
          setSaving(false);
        }
      };

      const discard = () => {
        load();
        setDirty(false);
        setFailed(false);
        setSaveError("");
      };

      const renderRows = (rows) =>
        rows.map((row) =>
          h("div", { className: "dshlph-row", key: row.id },
            h("input", {
              className: "dshlph-input",
              placeholder: isZh ? "请求头" : "Header",
              value: row.key,
              disabled: saving,
              onChange: (e) => updateRow(row.id, "key", e.target.value),
            }),
            h("input", {
              className: "dshlph-input",
              placeholder: isZh ? "值" : "Value",
              value: row.value,
              disabled: saving,
              onChange: (e) => updateRow(row.id, "value", e.target.value),
            }),
            h("button", {
              className: "dshlph-del",
              type: "button",
              disabled: saving,
              onClick: () => removeRow(row.id),
              children: "✕",
            })
          )
        );

      const renderRetryBlock = (retry) => {
        const isAlways = retry.mode === "always";
        const customCodes = retry.retryableCodes.filter((code) => !RETRY_CODE_OPTION_KEYS.has(code));
        const customText = customCodes.join(", ");
        const toggleCode = (code, checked) => {
          if (checked) {
            if (!retry.retryableCodes.includes(code)) patchRetry({ retryableCodes: [...retry.retryableCodes, code] });
          } else {
            patchRetry({ retryableCodes: retry.retryableCodes.filter((c) => c !== code) });
          }
        };
        return h("div", { className: "dshlph-card" },
          h("h3", { className: "dshlph-card-title", children: isZh ? "重试策略" : "Retry Policy" }),
          h("p", { className: "dshlph-card-hint", children: isZh
            ? "官方 dsh-llm-retry 按提供商生效；未配置时默认 normal 模式、重试 2 次、退避 500ms→10s、错误码为下方前五个。"
            : "Honored by dsh-llm-retry per provider. Default when unset: normal mode, 2 retries, backoff 500ms→10s, and the first five codes below." }),
          h("div", { className: "dshlph-field" },
            h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-mode", children: isZh ? "模式" : "Mode" }),
            h("select", {
              id: "dshlph-retry-mode",
              className: "dshlph-select",
              value: retry.mode,
              disabled: saving,
              onChange: (e) => patchRetry({ mode: e.target.value }),
              children: [
                h("option", { key: "normal", value: "normal", children: isZh ? "限次数重试（默认）" : "Bounded retries (default)" }),
                h("option", { key: "always", value: "always", children: isZh ? "无限重试（慎用）" : "Unbounded retries (use with care)" }),
              ],
            })
          ),
          !isAlways &&
            h("div", { className: "dshlph-field" },
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-max", children: isZh ? "最大重试次数" : "Max retries" }),
              h("input", {
                id: "dshlph-retry-max",
                className: "dshlph-input",
                type: "number",
                min: 0,
                step: 1,
                value: retry.maxRetries,
                disabled: saving,
                onChange: (e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0) patchRetry({ maxRetries: Math.trunc(n) });
                },
              })
            ),
          !isAlways &&
            h("div", { className: "dshlph-field" },
              h("span", { className: "dshlph-label", children: isZh ? "可重试错误码" : "Retryable codes" }),
              h("div", { className: "dshlph-codes" },
                RETRY_CODE_OPTIONS.map((option) =>
                  h("label", { key: option.code, className: "dshlph-code-label" },
                    h("input", {
                      type: "checkbox",
                      className: "dshlph-code-check",
                      checked: retry.retryableCodes.includes(option.code),
                      disabled: saving,
                      onChange: (e) => toggleCode(option.code, e.target.checked),
                    }),
                    h("span", { children: isZh ? option.zh : option.en }),
                    h("span", { className: "dshlph-code-badge", children: option.code })
                  )
                )
              ),
              h("div", { className: "dshlph-field", style: { marginTop: "8px" } },
                h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-codes-custom", children: isZh ? "其他错误码（逗号分隔，可选）" : "Other codes (comma-separated, optional)" }),
                h("input", {
                  id: "dshlph-retry-codes-custom",
                  className: "dshlph-input",
                  placeholder: isZh ? "例如 CUSTOM_CODE, NO_ADAPTER" : "e.g. CUSTOM_CODE, NO_ADAPTER",
                  value: customText,
                  disabled: saving,
                  onChange: (e) => {
                    const text = e.target.value;
                    const parsed = text.split(",").map((code) => code.trim()).filter((code) => code.length > 0 && !RETRY_CODE_OPTION_KEYS.has(code));
                    patchRetry({ retryableCodes: [...retry.retryableCodes.filter((code) => RETRY_CODE_OPTION_KEYS.has(code)), ...parsed] });
                  },
                })
              )
            ),
          isAlways &&
            h("p", { className: "dshlph-card-hint", children: isZh
              ? "无限重试会一直重试直到成功或下游给出不可恢复决策，持续故障时可能长时间等待。"
              : "Unbounded mode retries forever until success or an unrecoverable downstream decision; a persistent failure may wait for a long time." }),
          h("div", { className: "dshlph-subtitle", children: isZh ? "退避参数" : "Backoff" }),
          h("div", { className: "dshlph-backoff" },
            h("div", { className: "dshlph-field" },
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-initial", children: isZh ? "初始延迟（毫秒）" : "Initial delay (ms)" }),
              h("input", {
                id: "dshlph-retry-initial",
                className: "dshlph-input",
                type: "number",
                min: 1,
                step: 100,
                value: retry.backoff.initialDelayMs,
                disabled: saving,
                onChange: (e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) patchRetry({ backoff: { ...retry.backoff, initialDelayMs: n } });
                },
              })
            ),
            h("div", { className: "dshlph-field" },
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-maxdelay", children: isZh ? "最大延迟（毫秒）" : "Max delay (ms)" }),
              h("input", {
                id: "dshlph-retry-maxdelay",
                className: "dshlph-input",
                type: "number",
                min: 1,
                step: 1000,
                value: retry.backoff.maxDelayMs,
                disabled: saving,
                onChange: (e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) patchRetry({ backoff: { ...retry.backoff, maxDelayMs: n } });
                },
              })
            ),
            h("div", { className: "dshlph-field" },
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-jitter", children: isZh ? "抖动比例（0~1）" : "Jitter ratio (0~1)" }),
              h("input", {
                id: "dshlph-retry-jitter",
                className: "dshlph-input",
                type: "number",
                min: 0,
                max: 1,
                step: 0.05,
                value: retry.backoff.jitterRatio,
                disabled: saving,
                onChange: (e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0 && n <= 1) patchRetry({ backoff: { ...retry.backoff, jitterRatio: n } });
                },
              })
            )
          ),
          h("div", { className: "dshlph-footer" },
            h("button", {
              className: "dshlph-btn",
              type: "button",
              onClick: resetRetry,
              disabled: saving,
              children: isZh ? "恢复默认" : "Reset to default",
            })
          )
        );
      };

      // ── 思考强度：渲染 ────────────────────────────────────────────────
      const catalogText = () => {
        if (catalog === null || !catalog.fetchedAt) return TH.catalogNever;
        const days = Math.max(0, Math.round((Date.now() - catalog.fetchedAt) / 86400000));
        if (isZh) {
          return `外部目录：${days === 0 ? "今天" : days + " 天前"}更新 · ${catalog.entries} 条` + (catalog.stale ? "（已过期，建议更新）" : "");
        }
        return `External catalog: updated ${days === 0 ? "today" : days + "d ago"} · ${catalog.entries} entries` + (catalog.stale ? " (stale)" : "");
      };

      const renderThinkingRow = (row) => {
        const currentLabel = row.declaredMode === TH_MODE.OFF
          ? TH.currentOff
          : row.declaredMode === TH_MODE.CUSTOM
            ? TH.currentCustom
            : TH.currentInherit;
        const suggestion = row.suggestion;
        const picked = TH_LEVELS.filter((level) => Object.prototype.hasOwnProperty.call(row.levels, level));
        return h("div", { className: "dshlph-th-row" + (row.prefilled ? " dshlph-th-prefilled" : ""), key: row.id },
          h("div", { className: "dshlph-th-head" },
            h("span", { className: "dshlph-th-id", children: row.name ? row.id + "  ·  " + row.name : row.id }),
            h("span", {
              className: "dshlph-th-badge" + (row.declaredMode === TH_MODE.INHERIT ? "" : " dshlph-th-badge-on"),
              children: currentLabel,
            }),
            row.prefilled ? h("span", { className: "dshlph-th-badge dshlph-th-badge-on", children: TH.prefilled }) : null,
            suggestion
              ? h("span", {
                  className: "dshlph-th-badge",
                  children: (TH_SOURCE_LABEL[suggestion.source] || suggestion.source)
                    + "·" + (TH_CONFIDENCE_LABEL[suggestion.confidence] || suggestion.confidence),
                })
              : h("span", { className: "dshlph-th-badge", children: TH.noSuggestion }),
            h("select", {
              className: "dshlph-th-mode",
              value: row.mode,
              disabled: saving,
              onChange: (e) => setRowMode(row.id, e.target.value),
              children: [
                h("option", { key: "inherit", value: TH_MODE.INHERIT, children: TH.modeInherit }),
                h("option", { key: "off", value: TH_MODE.OFF, children: TH.modeOff }),
                h("option", { key: "custom", value: TH_MODE.CUSTOM, children: TH.modeCustom }),
              ],
            }),
            (suggestion && suggestion.efforts !== undefined) || row.capacitySuggestion !== undefined
              ? h("button", {
                  className: "dshlph-th-mini",
                  type: "button",
                  disabled: saving,
                  onClick: () => {
                    if (suggestion !== undefined && suggestion.efforts !== undefined) fillFromSuggestion(row.id);
                    if (row.capacitySuggestion !== undefined) fillCapacityFromSuggestion(row.id);
                  },
                  children: TH.applySuggestion,
                })
              : null
          ),
          row.mode === TH_MODE.CUSTOM
            ? h("div", null,
                h("div", { className: "dshlph-th-levels" },
                  ...TH_LEVELS.map((level) => h("label", { key: level, className: "dshlph-code-label" },
                    h("input", {
                      type: "checkbox",
                      className: "dshlph-code-check",
                      checked: Object.prototype.hasOwnProperty.call(row.levels, level),
                      disabled: saving,
                      onChange: (e) => toggleRowLevel(row.id, level, e.target.checked),
                    }),
                    h("span", { children: level })
                  ))
                ),
                picked.length > 0
                  ? h("div", { className: "dshlph-th-wires" },
                      ...picked.map((level) => h("div", { className: "dshlph-th-wire", key: level },
                        h("span", { children: level }),
                        h("input", {
                          className: "dshlph-input",
                          value: row.levels[level] === null || row.levels[level] === undefined ? "" : String(row.levels[level]),
                          placeholder: level === "off" ? TH.offHint : level,
                          disabled: saving,
                          onChange: (e) => setRowWire(row.id, level, e.target.value),
                        })
                      ))
                    )
                  : null,
                suggestion && suggestion.matched
                  ? h("p", { className: "dshlph-th-note", children: TH.matched + ": " + suggestion.matched + (suggestion.note ? " · " + suggestion.note : "") })
                  : null
              )
            : null,
          renderCapacityBlock(row)
        );
      };

      /** 单个模型行的容量/类型编辑区（与档位无关，随时可改）。 */
      const renderCapacityBlock = (row) => {
        const cap = row.capacitySuggestion;
        const picked = Array.isArray(row.input) && row.input.length > 0 ? row.input : ["text"];
        return h("div", { className: "dshlph-th-cap" },
          h("div", { className: "dshlph-th-caphead" },
            h("span", { className: "dshlph-th-badge", children: TH.capacityTitle }),
            cap
              ? h("span", { className: "dshlph-th-badge", children: (TH_SOURCE_LABEL[cap.source] || cap.source) + (cap.matched ? " · " + cap.matched : "") })
              : h("span", { className: "dshlph-th-badge", children: TH.noSuggestion }),
            row.prefilledCapacity ? h("span", { className: "dshlph-th-badge dshlph-th-badge-on", children: TH.capacityFilled }) : null
          ),
          h("div", { className: "dshlph-th-capgrid" },
            h("label", { className: "dshlph-th-capfield" },
              h("span", { children: TH.contextWindow }),
              h("input", {
                className: "dshlph-input",
                inputMode: "numeric",
                placeholder: cap && cap.contextWindow !== undefined ? String(cap.contextWindow) : TH.capacityEmpty,
                value: row.contextWindow,
                disabled: saving,
                onChange: (e) => setRowCapacity(row.id, "contextWindow", e.target.value),
              })
            ),
            h("label", { className: "dshlph-th-capfield" },
              h("span", { children: TH.maxTokens }),
              h("input", {
                className: "dshlph-input",
                inputMode: "numeric",
                placeholder: cap && cap.maxTokens !== undefined ? String(cap.maxTokens) : TH.capacityEmpty,
                value: row.maxTokens,
                disabled: saving,
                onChange: (e) => setRowCapacity(row.id, "maxTokens", e.target.value),
              })
            ),
            h("div", { className: "dshlph-th-capfield" },
              h("span", { children: TH.inputTypes }),
              h("div", { className: "dshlph-th-captypes" },
                ...[["text", TH.inputText], ["image", TH.inputImage]].map(([value, label]) =>
                  h("label", { key: value, className: "dshlph-code-label" },
                    h("input", {
                      type: "checkbox",
                      className: "dshlph-code-check",
                      checked: picked.includes(value),
                      // text 是唯一合法的空集替身，所以禁止取消（与官方模型页一致）
                      disabled: saving || (value === "text" && picked.length === 1),
                      onChange: (e) => toggleRowInput(row.id, value, e.target.checked),
                    }),
                    h("span", { children: label })
                  )
                )
              )
            )
          )
        );
      };

      const renderThinkingBlock = () => {
        const models = Array.isArray(providers[route] && providers[route].models) ? providers[route].models : [];
        return h("div", { className: "dshlph-card" },
          h("h3", { className: "dshlph-card-title", children: TH.title }),
          h("p", { className: "dshlph-card-hint", children: TH.hint }),
          h("div", { className: "dshlph-th-actions" },
            h("button", {
              className: "dshlph-add",
              type: "button",
              disabled: saving || thinkingBusy,
              onClick: probeThinking,
              children: thinkingBusy ? TH.detecting : TH.autoDetect,
            }),
            h("button", {
              className: "dshlph-add",
              type: "button",
              disabled: saving || catalogBusy,
              onClick: refreshCatalog,
              children: catalogBusy ? TH.refreshing : TH.refreshCatalog,
            }),
            h("span", { className: "dshlph-th-status", children: catalogText() })
          ),
          thinkingNote ? h("p", { className: "dshlph-th-note", children: thinkingNote }) : null,
          thinkingFailed ? h("p", { className: "dshlph-failed", children: TH.invalid }) : null,
          models.length === 0
            ? h("p", { className: "dshlph-empty", children: TH.noModels })
            : h("div", { className: "dshlph-th-list" }, ...thinkingRows.map(renderThinkingRow))
        );
      };

      const ready = status === "ready";
      const providerKeys = Object.keys(providers);

      return h("div", { className: "dshlph-section" },
        h("h2", { className: "dshlph-title", children: title }),
        h("p", { className: "dshlph-intro", children: description }),
        status === "loading"
          ? null
          : !ready
            ? h("p", { className: "dshlph-empty", children: isZh ? "设置桥不可用，请确认插件已通过标准方式安装。" : "Settings bridge unavailable. Make sure the plugin is installed via the standard dsh plugin flow." })
            : providerKeys.length === 0
              ? h("p", { className: "dshlph-empty", children: emptyProviders })
              : h("div", { className: "dshlph-card" },
                  h("div", { className: "dshlph-field" },
                    h("label", { className: "dshlph-label", htmlFor: "dshlph-provider-select", children: isZh ? "提供商" : "Provider" }),
                    h("select", {
                      id: "dshlph-provider-select",
                      className: "dshlph-select",
                      value: route,
                      disabled: saving,
                      onChange: (e) => selectRoute(e.target.value),
                      children: providerKeys.map((key) => h("option", { key, value: key, children: providers[key]?.displayName || key })),
                    })
                  ),
                  route
                    ? [
                        h("div", { className: "dshlph-field" },
                          h("h3", { className: "dshlph-card-title", children: isZh ? "自定义请求头（官方 headers 字段）" : "Custom request headers (official `headers` field)" }),
                          h("p", {
                            className: "dshlph-card-hint",
                            children: isZh
                              ? "User-Agent 写在这里即可——官方适配器会过滤它，本插件在请求层把它补回；其他头官方原样发送。"
                              : "Put User-Agent here — the official adapter filters it and this plugin re-injects it; other headers are sent as-is.",
                          }),
                          ...renderRows(headers),
                          h("button", {
                            className: "dshlph-add",
                            type: "button",
                            disabled: saving,
                            onClick: addRow,
                            children: isZh ? "+ 添加请求头" : "+ Add header",
                          })
                        ),
                        h("hr", { className: "dshlph-divider" }),
                        // ── Key Pool 轮询 ──
                        h("div", { className: "dshlph-card" },
                          h("h3", { className: "dshlph-card-title", children: isZh ? "Key 轮询（多 Key Round-Robin）" : "Key Pool (Round-Robin)" }),
                          h("p", {
                            className: "dshlph-card-hint",
                            children: isZh
                              ? "每次请求从 Key 池中按顺序轮询选取下一个注入指定请求头。「模型」页为该提供商保存的主 Key 自动作为 1 号位（无需重复粘贴）；在下方追加的 Key 依次排队。额度耗尽的 Key 会自动暂停并在重置时间自动回池。"
                              : "Each request picks the next key round-robin and injects it into the specified header. The primary key saved on the Models page is automatically slot #1 (no need to paste it again); keys added below queue up behind it. Exhausted keys pause and rejoin the pool at their reset time.",
                          }),
                          h("div", { className: "dshlph-field" },
                            h("label", { className: "dshlph-label", children: isZh ? "启用 Key 轮询" : "Enable key pool" }),
                            h("label", { className: "dshlph-code-label", style: { display: "inline-flex", width: "fit-content" } },
                              h("input", {
                                type: "checkbox",
                                className: "dshlph-code-check",
                                checked: useKeyPool,
                                disabled: saving,
                                onChange: (e) => toggleKeyPool(e.target.checked),
                              }),
                              h("span", { children: useKeyPool ? (isZh ? "已启用" : "Enabled") : (isZh ? "未启用" : "Disabled") })
                            )
                          ),
                          useKeyPool && h("div", { className: "dshlph-field" },
                            h("label", { className: "dshlph-label", htmlFor: "dshlph-kp-header", children: isZh ? "请求头名称" : "Header name" }),
                            h("input", {
                              id: "dshlph-kp-header",
                              className: "dshlph-input",
                              placeholder: "Authorization",
                              value: keyPoolHeaderName,
                              disabled: saving,
                              onChange: (e) => { setKeyPoolHeaderName(e.target.value); setDirty(true); setFailed(false); },
                            })
                          ),
                          useKeyPool && h("div", { className: "dshlph-field" },
                            h("span", { className: "dshlph-label", children: isZh ? "Key 列表（按顺序轮询）" : "Key list (rotated in order)" }),
                            h("label", { className: "dshlph-code-label", style: { display: "inline-flex", width: "fit-content", marginTop: "4px" } },
                              h("input", {
                                type: "checkbox",
                                className: "dshlph-code-check",
                                checked: showKeys,
                                onChange: (e) => setShowKeys(e.target.checked),
                              }),
                              h("span", { children: isZh ? "显示明文" : "Show plaintext" })
                            ),
                            useKeyPool && hasPrimaryKey && h("div", { className: "dshlph-keyrow", key: "primary-models-key" },
                              h("input", {
                                className: "dshlph-input",
                                type: "text",
                                readOnly: true,
                                value: isZh ? "① 模型页主 Key（自动继承，无需填写）" : "① Models page primary key (inherited automatically)",
                                disabled: saving,
                                style: { opacity: 0.75, cursor: "default" },
                              }),
                              h("span", { className: "dshlph-del", style: { cursor: "default" }, children: "🔒" })
                            ),
                            ...keyPoolRows.map((row) =>
                              h("div", { className: "dshlph-keyrow", key: row.id },
                                h("input", {
                                  className: "dshlph-input",
                                  type: showKeys ? "text" : "password",
                                  autoComplete: "off",
                                  placeholder: isZh ? "完整头值，如 Bearer sk-xxx" : "Full header value, e.g. Bearer sk-xxx",
                                  value: row.value,
                                  disabled: saving,
                                  onChange: (e) => updateKeyRow(row.id, e.target.value),
                                }),
                                h("button", {
                                  className: "dshlph-del",
                                  type: "button",
                                  disabled: saving,
                                  onClick: () => removeKeyRow(row.id),
                                  children: "✕",
                                })
                              )
                            ),
                            h("button", {
                              className: "dshlph-add",
                              type: "button",
                              disabled: saving,
                              onClick: addKeyRow,
                              children: isZh ? "+ 添加 Key" : "+ Add key",
                            }),
                            h("p", {
                              className: "dshlph-card-hint",
                              style: { marginTop: "6px" },
                              children: isZh
                                ? "当前池共 " + ((hasPrimaryKey ? 1 : 0) + keyPoolRows.length) + " 个 Key" + (hasPrimaryKey ? "（模型页主 Key + 追加 Keys）" : "") + "，重复项保存时自动去重，的请求按 1→2→3→1→… 循环轮询。"
                                : (hasPrimaryKey ? 1 : 0) + keyPoolRows.length + " key(s) in the pool" + (hasPrimaryKey ? " (Models primary key + added keys)" : "") + " — duplicates deduplicated on save. Requests rotate 1→2→3→1→…",
                            }),
                            // ── Key 健康度（真实请求统计，非配置）──
                            keyHealth && keyHealth.keys && keyHealth.keys.length > 0 && h("div", {
                              className: "dshlph-field",
                              style: { marginTop: "10px" },
                            },
                              h("span", { className: "dshlph-label", children: isZh ? "Key 健康度（保存后刷新；页面不自动实时更新）" : "Key health (refreshed on save; not live)" }),
                              keyHealth.keys.every((k) => k.uses === 0)
                                ? h("p", {
                                    className: "dshlph-card-hint",
                                    style: { marginTop: "6px" },
                                    children: isZh
                                      ? "暂无调用——用该提供商发起一次对话后，此处会显示每个 Key 的调用/失败统计与失效告警。"
                                      : "No traffic yet — chat once with this provider and per-key call/failure stats appear here.",
                                  })
                                : h("div", { className: "dshlph-codes", style: { marginTop: "6px" } },
                                ...keyHealth.keys.map((k) =>
                                  h("div", {
                                    key: "kh-" + k.index,
                                    className: "dshlph-code-label" + (k.suspect ? " dshlph-code-bad" : ""),
                                    style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" },
                                  },
                                    h("span", { style: { fontFamily: "var(--dsw-alias-font-mono, monospace)", wordBreak: "break-all" },
                                      children: "#" + (k.index + 1) + "  " + k.masked }),
                                    h("span", { style: { fontSize: "12px", opacity: 0.85 },
                                      children: (isZh ? "调用 " : "uses ") + k.uses
                                        + (isZh ? " · 失败 " : " · failures ") + k.failures
                                        + (k.lastErrorCode ? " · " + k.lastErrorCode : "")
                                        + (k.suspect ? (isZh ? " · ⚠️ 疑似失效，建议检查替换" : " · ⚠️ suspect, replace soon") : ""),
                                    }),
                                  )
                                ),
                              ),
                              h("p", {
                                className: "dshlph-card-hint",
                                style: { marginTop: "6px" },
                                children: isZh
                                  ? "统计自插件启动起累计；标 ⚠️ 的 Key 最近一次失败为凭据无效/配额耗尽/限流。修复或删除该 Key 后保存即可，统计将重新开始。"
                                  : "Stats accumulate since plugin start; keys marked ⚠️ last failed with INVALID_CREDENTIAL/QUOTA/RATE_LIMIT. Fix or remove the key and save — counters reset on config change.",
                              }),
                            )
                          ),
                        ),
                        renderRetryBlock(retryState),
                        renderThinkingBlock(),
                        h("div", { className: "dshlph-footer" },
                          saveError ? h("p", { className: "dshlph-failed", children: saveError }) : null,
                          failed ? h("p", { className: "dshlph-failed", children: isZh ? "保存失败（配置被官方校验拒绝，请检查数值范围）" : "Save failed (official validation rejected the config; check numeric ranges)" }) : null,
                          h("button", {
                            className: "dshlph-btn",
                            type: "button",
                            onClick: discard,
                            disabled: saving || !(dirty || thinkingRows.some(rowChanged)),
                            children: isZh ? "放弃修改" : "Discard",
                          }),
                          h("button", {
                            className: "dshlph-btn dshlph-save",
                            type: "button",
                            onClick: save,
                            disabled: saving || !ready || !(dirty || thinkingRows.some(rowChanged)),
                            children: saving ? (isZh ? "保存中…" : "Saving…") : isZh ? "保存" : "Save",
                          })
                        ),
                      ]
                    : null
                )
      );
    }

    const inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("settings.section", () =>
        ctx.slots.register(
          {
            name: "settings.section",
            id: "model-headers",
            order: 11,
            label: () => title,
            inject: () => ({}),
          },
          HeadersSection
        )
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    // 纯草稿逻辑暴露给 test-client.mjs（浏览器 bundle 无法被 node 直接渲染，
    // 但这一层是"会不会写坏配置"的关键，必须能单测）。
    exports.__test = {
      declaredStateOf,
      thinkingRowsOf,
      withSuggestions,
      ladderOfRow,
      ladderIsSendable,
      sameLadder,
      rowChanged,
      capacityChanged,
      capacityNumber,
      mergeCompatPatch,
      readBridgeJson,
      TH_LEVELS,
      TH_MODE,
    };
    return module.exports;
  },
});