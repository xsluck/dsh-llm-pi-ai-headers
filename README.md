# dsh-llm-pi-ai-headers

让 dsh 的「模型」设置页支持**按提供商配置自定义请求头**（键值对编辑器），并接管 `llm-pi-ai` 适配器：每个请求默认带上 `attributionHeaders`（含 `user-agent`）→ 你配置的 `headers` → `extraHeaders` 逐层合并，`extraHeaders` 优先。

典型用途：OpenCode Zen 免费层会拒绝非 opencode 的 `User-Agent`（HTTP 429/403）。装上本插件后，在 UI 里给 `opencode` 提供商加一条 `User-Agent: opencode/1.18.18` 即可稳定使用。

## 功能

- **自定义请求头编辑器**：模型页编辑卡的「额外请求头」区、自定义提供方表单，均改为键值对行编辑器（原官方版只能手填 JSON，且自定义表单根本没有这个入口）
- **模型发现增强**：目录内提供商（anthropic、opencode 等）「获取可用模型」直接返回官方模型目录（带显示名称）；第三方端点只返回 `id` 时自动派生显示名（`agnes-2.0-flash` → `Agnes 2.0 Flash`）
- **baseURL 自动回落**：与官方适配器一致，配置文件未写 `baseURL` 时自动使用 pi-ai 目录内置端点（如 `zai-coding-cn` → `https://open.bigmodel.cn/api/coding/paas/v4`），不再抛出 `INVALID_PROFILE`；仅目录外的自定义提供商仍需手填 baseURL
- **推理等级按模型自动解析**：恢复官方适配器的行为——模型页「推理等级」下拉按各模型在 pi-ai 目录中的能力列出（如 GLM 系列 → 关/极少/低/中/高，`glm-5.2` 额外支持最大；opencode 的 `deepseek-v4-flash-free` → 高/最大），不再所有模型一律只有关/高/最大；请求参数的封箱（`thinking`/`reasoning_effort`/OpenRouter 嵌套对象等）跟随目录的 `compat.thinkingFormat` 与 `thinkingLevelMap` 逐模型生成，`off` 对 zai 格式会真正发送 `thinking: disabled`
- **恢复「添加提供方」**：官方适配器目录注册缺失导致添加按钮置灰，本插件补齐 37 个目录提供商
- **移除无用的代理框**：官方适配器从未实现 `proxy` 配置，UI 上的代理输入框是摆设，一并移除
- 中英双语

## 安装

需要 Node.js 18+。**先停止 dsh web 服务**（或忽略，重启时生效），然后：

```bash
# 方式一：clone 仓库后直接安装
git clone https://github.com/xsluck/dsh-llm-pi-ai-headers.git
cd dsh-llm-pi-ai-headers
node install.mjs

# 方式二：只复制文件到目标机（无 git）
# 把整个目录拷过去，进目录执行 node install.mjs
```

安装脚本会自动：

1. 定位 dsh 数据目录（默认 `~/.dsh`，可用 `--home` 覆盖）并写入插件文件
   `profiles/web/src/llm-pi-ai.mjs`
2. 合并 `profiles/web/cordis.patch.yml`：禁用官方 `llm-pi-ai`，插入替换插件（幂等，可重复执行）
3. 定位 dsh 客户端包（`dsh-client-ui-settings-models/lib/client.js`，从 profiles 的符号链接解析）并打前端补丁（首次会备份原文件为 `client.js.dsh-zen.bak`；dsh 升级后重跑本脚本即重新打补丁）

### 参数

| 参数 | 说明 |
| --- | --- |
| `--home <dir>` | dsh 数据目录，默认 `$HOME/.dsh`（Windows 为 `%USERPROFILE%\.dsh`） |
| `--client <file>` | 显式指定前端 bundle 路径（自动定位失败时用） |
| `--skip-client` | 只装服务端插件，不打前端补丁 |
| `--client-only` | 只打前端补丁，不动配置（测试用） |

环境变量 `DSH_HOME` 也可指定数据目录。

## 使用

1. 重启 dsh web 进程
2. 浏览器硬刷新（Ctrl+F5）加载新前端
3. 「模型」页 → 编辑 `opencode` 提供商（或添加自定义提供方）
4. 展开「自定义设置」→「额外请求头」→ 添加行：`User-Agent` / `opencode/1.18.18`
5. 应用保存

请求头合并顺序：`attributionHeaders`（官方身份头）→ `Authorization` → `headers`（settings.yaml 手写）→ `extraHeaders`（UI 保存，优先）。

## 卸载

```bash
node uninstall.mjs              # 恢复前端备份 + 还原 cordis.patch.yml
node uninstall.mjs --purge      # 同时删除插件文件
```

## 兼容性

- 针对 dsh `@deepseek-ai/dsh-client-ui-settings-models` 某具体版本开发；前端补丁带锚点校验，版本不匹配时会明确报错（此时可用 `--skip-client` 只装服务端插件）
- dsh 升级覆盖客户端包后，重跑 `node install.mjs` 即可重新打补丁（原版备份以 `.dsh-zen.bak` 保留）
- 适配器依赖 dsh 自带包：`@deepseek-ai/dsh-llm`、`@earendil-works/pi-ai` 等，无需额外安装

## 目录结构

```
dsh-llm-pi-ai-headers/
├── install.mjs            # 安装脚本（幂等）
├── uninstall.mjs          # 卸载脚本
├── plugin/
│   └── llm-pi-ai.mjs      # 服务端插件（替换适配器）
└── patches/               # 前端补丁片段（目标版本锚点）
    ├── headers-editor.js.txt
    ├── edit-call.js.txt
    ├── custom-call.js.txt
    ├── en-keys.txt
    └── zh-keys.txt
```

## License

MIT
