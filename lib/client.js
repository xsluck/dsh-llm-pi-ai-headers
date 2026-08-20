window.__ModuleLoader__.load({
  id: "dsh-llm-pi-ai-headers",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    let react = require("react");
    const h = react.createElement;

    //#region styles
    const css = [
      ".dshlph-section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}",
      ".dshlph-title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:500;line-height:24px}",
      ".dshlph-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}",
      ".dshlph-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;min-width:0;margin-bottom:8px;padding:12px 14px;overflow:hidden}",
      ".dshlph-block-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px;margin:0}",
      ".dshlph-field{flex-direction:column;gap:4px;min-width:0;display:flex}",
      ".dshlph-label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}",
      ".dshlph-hint{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}",
      ".dshlph-select{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:6px;padding:6px 8px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%;max-width:240px}",
      ".dshlph-input{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:6px;padding:6px 8px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%}",
      ".dshlph-row{display:grid;grid-template-columns:1fr 1.6fr auto;gap:6px;align-items:center}",
      ".dshlph-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}",
      ".dshlph-add{font:inherit;cursor:pointer;border-radius:6px;padding:5px 12px;font-size:13px;background:0 0;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);align-self:flex-start}",
      ".dshlph-add:hover{border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary)}",
      ".dshlph-del{font:inherit;cursor:pointer;border-radius:6px;padding:5px 10px;font-size:13px;background:0 0;border:1px solid transparent;color:var(--dsw-alias-state-error-primary)}",
      ".dshlph-del:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}",
      ".dshlph-footer{justify-content:flex-end;align-items:center;gap:8px;display:flex}",
      ".dshlph-failed{color:var(--dsw-alias-state-error-primary);margin:0 auto 0 0;font-size:12px}",
      ".dshlph-btn{font:inherit;cursor:pointer;border-radius:6px;padding:5px 12px;font-size:13px;transition:background-color .13s,border-color .13s,color .13s}",
      ".dshlph-save{border:1px solid var(--dsw-alias-button-info-fill);background:var(--dsw-alias-button-info-fill);color:var(--dsw-alias-label-primary-foreground)}",
      ".dshlph-save:hover:not(:disabled){border-color:var(--dsw-alias-button-info-hover);background:var(--dsw-alias-button-info-hover)}",
      ".dshlph-save:disabled{opacity:.5;cursor:default}",
      ".dshlph-btn:disabled{opacity:.5;cursor:default}",
      ".dshlph-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;margin:0}",
      ".dshlph-divider{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:12px 0}",
      ".dshlph-retry-badge{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin:0 0 8px}",
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

    const title = isZh ? "模型扩展" : "Model Headers";
    const description = isZh
      ? "按提供商配置请求头与失败重试策略。User-Agent 会被官方适配器过滤，由本插件在请求层补回；其他请求头与 retryPolicy 官方原样生效。"
      : "Configure per-provider request headers and retry policy. User-Agent is filtered by the official adapter and re-injected by this plugin; other headers and retryPolicy are honored by the official stack as-is.";
    const emptyProviders = isZh
      ? "还没有已配置的提供商。请先在「模型」页添加提供商，再回来编辑请求头与重试策略。"
      : "No providers configured yet. Add one in the Models page first, then edit headers and retry policy here.";

    const DEFAULT_RETRY = Object.freeze({
      mode: "normal",
      maxRetries: 2,
      retryableCodes: ["RATE_LIMIT", "SERVER", "TIMEOUT", "TRANSPORT", "EMPTY_RESPONSE"],
      backoff: Object.freeze({ initialDelayMs: 500, maxDelayMs: 10000, jitterRatio: 0.1 }),
    });
    const DEFAULT_RETRY_CODES_TEXT = DEFAULT_RETRY.retryableCodes.join(", ");

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

    async function bridgeDescribe() {
      const response = await fetch(`${BRIDGE_PREFIX}/describe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      return response.json();
    }

    async function bridgeMutate(payload) {
      const response = await fetch(`${BRIDGE_PREFIX}/mutate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      return response.json();
    }

    function HeadersSection(props) {
      const [status, setStatus] = react.useState("loading");
      const [providers, setProviders] = react.useState({});
      const [route, setRoute] = react.useState("");
      const [headers, setHeaders] = react.useState([]);
      const [retryState, setRetryState] = react.useState(() => ({ ...DEFAULT_RETRY, backoff: { ...DEFAULT_RETRY.backoff }, retryableCodes: [...DEFAULT_RETRY.retryableCodes] }));
      const [dirty, setDirty] = react.useState(false);
      const [saving, setSaving] = react.useState(false);
      const [failed, setFailed] = react.useState(false);

      const applyProfile = (profile) => {
        setHeaders(dictToRows(profile?.headers));
        const next = retryFromProfile(profile);
        setRetryState({ ...next, backoff: { ...next.backoff }, retryableCodes: [...next.retryableCodes] });
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
              setRoute(current);
              applyProfile(nextProviders[current]);
              setStatus("ready");
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

      const selectRoute = (value) => {
        setRoute(value);
        applyProfile(providers[value]);
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

      const patchRetry = (patch) => {
        setRetryState((prev) => ({ ...prev, ...patch }));
        setDirty(true);
        setFailed(false);
      };

      const setRetryCodes = (text) => {
        const codes = text.split(",").map((code) => code.trim()).filter((code) => code.length > 0);
        patchRetry({ retryableCodes: codes });
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
          const result = await bridgeMutate({ ns: NS, ops });
          if (result.ok) {
            setDirty(false);
            setFailed(false);
            await load();
          } else {
            setFailed(true);
          }
        } catch {
          setFailed(true);
        } finally {
          setSaving(false);
        }
      };

      const discard = () => {
        load();
        setDirty(false);
        setFailed(false);
      };

      const renderRows = (rows) =>
        rows.map((row) =>
          h("div", { className: "dshlph-row", key: row.id },
            h("input", {
              className: "dshlph-input",
              placeholder: "Header",
              value: row.key,
              disabled: saving,
              onChange: (e) => updateRow(row.id, "key", e.target.value),
            }),
            h("input", {
              className: "dshlph-input",
              placeholder: "Value",
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
        const codeText = retry.retryableCodes.join(", ");
        return h("div", { className: "dshlph-card" },
          h("h3", { className: "dshlph-block-title", children: isZh ? "重试策略" : "Retry Policy" }),
          h("p", { className: "dshlph-retry-badge", children: isZh
            ? "官方 dsh-llm-retry 按提供商生效；未配置时默认：normal 模式、重试 2 次、错误码 RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT / EMPTY_RESPONSE、退避 500ms→10s。"
            : "Honored by dsh-llm-retry per provider. Default when unset: normal mode, 2 retries, codes RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT / EMPTY_RESPONSE, backoff 500ms→10s." }),
          h("div", { className: "dshlph-field" },
            h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-mode", children: isZh ? "模式" : "Mode" }),
            h("select", {
              id: "dshlph-retry-mode",
              className: "dshlph-select",
              value: retry.mode,
              disabled: saving,
              onChange: (e) => patchRetry({ mode: e.target.value }),
              children: [
                h("option", { key: "normal", value: "normal", children: isZh ? "normal（限次数，默认）" : "normal (bounded, default)" }),
                h("option", { key: "always", value: "always", children: isZh ? "always（无限重试，慎用）" : "always (unbounded, use with care)" }),
              ],
            })
          ),
          isAlways
            ? h("p", { className: "dshlph-hint", children: isZh
                ? "always 模式会一直重试直到成功或下游给出不可恢复决策，持续故障时可能长时间等待。"
                : "always mode retries forever until success or an unrecoverable downstream decision; a persistent failure may wait for a long time." })
            : h("div", { className: "dshlph-field" },
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
                }),
                h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-codes", children: isZh ? "可重试错误码（逗号分隔）" : "Retryable codes (comma-separated)" }),
                h("input", {
                  id: "dshlph-retry-codes",
                  className: "dshlph-input",
                  value: codeText,
                  disabled: saving,
                  onChange: (e) => setRetryCodes(e.target.value),
                })
              ),
          h("div", { className: "dshlph-grid3" },
            h("div", { className: "dshlph-field" },
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-initial", children: "initialDelayMs" }),
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
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-maxdelay", children: "maxDelayMs" }),
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
              h("label", { className: "dshlph-label", htmlFor: "dshlph-retry-jitter", children: "jitterRatio" }),
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
                          h("span", { className: "dshlph-label", children: isZh ? "自定义请求头（官方 headers 字段）" : "Custom request headers (official `headers` field)" }),
                          h("p", {
                            className: "dshlph-hint",
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
                        renderRetryBlock(retryState),
                        h("div", { className: "dshlph-footer" },
                          failed ? h("p", { className: "dshlph-failed", children: isZh ? "保存失败（配置被官方校验拒绝，请检查数值范围）" : "Save failed (official validation rejected the config; check numeric ranges)" }) : null,
                          h("button", {
                            className: "dshlph-btn",
                            type: "button",
                            onClick: discard,
                            disabled: saving || !dirty,
                            children: isZh ? "放弃修改" : "Discard",
                          }),
                          h("button", {
                            className: "dshlph-btn dshlph-save",
                            type: "button",
                            onClick: save,
                            disabled: saving || !dirty || !ready,
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
    return module.exports;
  },
});