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
      ".dshlph-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;min-width:0;list-style:none;margin-bottom:8px;padding:12px 14px;overflow:hidden}",
      ".dshlph-field{flex-direction:column;gap:4px;min-width:0;display:flex}",
      ".dshlph-label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}",
      ".dshlph-hint{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px}",
      ".dshlph-select{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:6px;padding:6px 8px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%;max-width:240px}",
      ".dshlph-input{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:6px;padding:6px 8px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%}",
      ".dshlph-row{display:grid;grid-template-columns:1fr 1.6fr auto;gap:6px;align-items:center}",
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
      ".dshlph-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;margin:0}",
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
      ? "编辑官方 llm-pi-ai 的请求头（headers 字段）。User-Agent 会被官方适配器过滤，由本插件在请求层补回；其他请求头官方原样发送。"
      : "Edit request headers in the official llm-pi-ai settings. User-Agent is filtered by the official adapter and re-injected by this plugin; other headers are sent as-is.";
    const emptyProviders = isZh
      ? "还没有已配置的提供商。请先在「模型」页添加提供商，再回来编辑请求头。"
      : "No providers configured yet. Add one in the Models page first, then edit request headers here.";

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
      const [dirty, setDirty] = react.useState(false);
      const [saving, setSaving] = react.useState(false);
      const [failed, setFailed] = react.useState(false);

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
              setRoute((current) => (keys.includes(current) ? current : (keys[0] ?? "")));
              setHeaders(dictToRows(nextProviders[(keys.includes(route) ? route : (keys[0] ?? ""))]?.headers));
              setDirty(false);
              setFailed(false);
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
        const profile = providers[value] ?? {};
        setRoute(value);
        setHeaders(dictToRows(profile.headers));
        setDirty(false);
        setFailed(false);
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

      const save = async () => {
        if (!route) return;
        setSaving(true);
        setFailed(false);
        try {
          const headersValue = rowsToDict(headers);
          const currentProfile = providers[route] ?? {};
          const ops = [];
          if (Object.keys(headersValue).length > 0 || currentProfile.headers !== undefined) {
            ops.push({ op: "set", path: ["providers", route, "headers"], value: headersValue });
          }
          if (ops.length === 0) {
            setDirty(false);
            setFailed(false);
            await load();
            return;
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
                        h("div", { className: "dshlph-footer" },
                          failed ? h("p", { className: "dshlph-failed", children: isZh ? "保存失败" : "Save failed" }) : null,
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