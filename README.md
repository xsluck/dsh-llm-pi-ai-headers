# dsh-llm-pi-ai-headers

让 dsh 支持**按提供商配置自定义请求头**，同时**保留官方 `llm-pi-ai` 适配器**。

旧版插件会禁用并替换官方适配器，因此必须自己解析 SSE 流，承担了参数截断 400、`reasoning_content` 回传等契约风险。本版本改为 B 方案：官方适配器完全保留（流解析、reasoning 回传、工具调用、上下文窗口判定等全部由官方 pi-ai 处理），本插件只做一件事——把官方适配器因 attribution 保留名过滤而丢掉的 `user-agent` 在请求最后一层补回去。

典型用途：OpenCode Zen 免费层会拒绝非 opencode 的 `User-Agent`（HTTP 429/403）。装上本插件后，给 `opencode` 提供商加一条 `User-Agent: opencode/1.18.18` 即可稳定使用。

## 功能

- **按提供商配置请求头**：编辑器出现在设置侧边栏「模型扩展」分节（位于「模型」与「插件」之间）
- **按提供商配置重试策略**：同一分节可编辑官方 `retryPolicy`（模式 normal/always、最大重试次数、可重试错误码、退避参数 initialDelayMs/maxDelayMs/jitterRatio），并支持一键恢复默认
- **配置入口保持官方原样**：写的是官方 `llm-pi-ai.providers.<route>.headers` / `.retryPolicy` 字段，`settings.yaml` 手写与 UI 编辑完全等价；Models 页面、设置页面均为官方原样
- **User-Agent 自动补回**：官方适配器把 `user-agent` 当作 attribution 保留头过滤掉（`requestHeaders()`），本插件在底层 pi-ai 的 `transformHeaders` 钩子（所有头合并完成之后）把它补进最终请求头；其余自定义头官方原样发送
- **官方适配器全部能力保留**：reasoning 回传、SSE 解析、工具调用、上下文窗口判定等，与未装插件时完全一致
- 中英双语

## 标准安装（推荐，升级不用重跑）

这是面向更多用户的首选方式。插件做成标准 dsh 包：

- `cordis.patch.yml` **不修改**官方 `llm-pi-ai` 适配器，仅插入本插件
- 前端通过官方 `settings.section` 槽位注册，显示为设置侧边栏「模型扩展」分节
- **不修改任何官方 dsh 客户端 bundle**，因此 dsh 升级后无需重装/重跑

### 方式一：已发布到 npm（示例）

```bash
dsh plugin --profile web add dsh-llm-pi-ai-headers
```

然后重启 dsh web，浏览器硬刷新即可。

### 方式二：直接从 Git 安装（不需要先 clone）

```bash
# 最常见：直接装 GitHub 仓库
dsh plugin --profile web add "git+https://github.com/xsluck/dsh-llm-pi-ai-headers.git"

# 也可以指定 tag / 分支 / commit
dsh plugin --profile web add "github:xsluck/dsh-llm-pi-ai-headers#v0.2.0"
dsh plugin --profile web add "git+https://github.com/xsluck/dsh-llm-pi-ai-headers.git#main"
```

dsh 内部走 pnpm，所以 pnpm 支持的 git 依赖写法都可用。装完后同样重启 dsh web，浏览器硬刷新。

### 方式三：本地仓库安装

```bash
git clone https://github.com/xsluck/dsh-llm-pi-ai-headers.git
cd dsh-llm-pi-ai-headers

# 把本目录作为本地包装进 web profile
dsh plugin --profile web add "file:."
```

或者手动在 profile 里引入：

```bash
cd ~/.dsh/profiles/web
pnpm add "file:/path/to/dsh-llm-pi-ai-headers"
```

重启 dsh 后，请求头编辑器出现在：

```text
设置 → 模型扩展
```

### 从旧版迁移到标准安装（重要）

如果你之前用过 `node install.mjs`，请先清理旧的手工补丁，否则旧 `file:///.../src/llm-pi-ai.mjs` 条目会覆盖标准包：

```bash
# 在旧版目录里执行，会还原前端备份并删除旧 cordis 条目
node uninstall.mjs --purge

# 然后重新安装标准包
dsh plugin --profile web add dsh-llm-pi-ai-headers
# 或本地安装：
dsh plugin --profile web add "file:."
```

或者手动从 `~/.dsh/profiles/web/cordis.patch.yml` 中删除这两段旧条目：

```yaml
- id: llm-pi-ai
  disabled: true

- insert:
    - id: llm-pi-ai-compat
      name: 'file:///.../src/llm-pi-ai.mjs'
```

删除后重启 dsh web 即可。

## 旧版安装（离线 patch，仅建议现有用户保留）

> 旧版 `install.mjs` 会修改官方 `dsh-client-ui-settings-models/lib/client.js`。
> 如果 dsh 升级覆盖了该文件，需要重跑 `node install.mjs`。**新用户请优先使用上面的标准安装。**

需要 Node.js 18+。**先停止 dsh web 服务**（或忽略，重启时生效），然后：

```bash
# 方式一：clone 仓库后直接安装
git clone https://github.com/xsluck/dsh-llm-pi-ai-headers.git
cd dsh-llm-pi-ai-headers
node install.mjs

# 方式二：只复制文件到目标机（无 git）
# 把整个目录拷过去，进目录执行 node install.mjs
```

旧版安装脚本会自动：

1. 定位 dsh 数据目录（默认 `~/.dsh`，可用 `--home` 覆盖）并写入插件文件
   `profiles/web/src/llm-pi-ai.mjs`
2. 合并 `profiles/web/cordis.patch.yml`：禁用官方 `llm-pi-ai`，插入替换插件（幂等，可重复执行）
3. 定位 dsh 客户端包（`dsh-client-ui-settings-models/lib/client.js`，从 profiles 的符号链接解析）并打前端补丁（首次会备份原文件为 `client.js.dsh-zen.bak`；dsh 升级后重跑本脚本即重新打补丁）

> 注意：旧版安装得到的是**替换适配器**的实现，功能与标准版不同（见上文「功能」）。新用户不要用旧版。

### 旧版参数

| 参数 | 说明 |
| --- | --- |
| `--home <dir>` | dsh 数据目录，默认 `$HOME/.dsh`（Windows 为 `%USERPROFILE%\.dsh`） |
| `--client <file>` | 显式指定前端 bundle 路径（自动定位失败时用） |
| `--skip-client` | 只装服务端插件，不打前端补丁 |
| `--client-only` | 只打前端补丁，不动配置（测试用） |

环境变量 `DSH_HOME` 也可指定数据目录。

## 使用

1. 重启 dsh web 进程
2. 浏览器硬刷新（Ctrl+F5）
3. 打开 **设置 → 模型扩展**
4. 选择提供商 → 添加请求头，例如：

   | Key | Value |
   | --- | --- |
   | `User-Agent` | `opencode/1.18.18` |
   | `X-Custom` | `your-value` |

5. 如需调整失败重试：在下方「重试策略」区修改最大重试次数 / 错误码 / 退避参数（默认 normal 模式 2 次，可一键恢复默认）
6. 保存

请求头合并顺序：官方 `attributionHeaders`（身份头）→ `Authorization` → `headers`（settings.yaml / UI 写入，官方原样发送，其中 `user-agent` 被官方过滤）→ 本插件 `transformHeaders` 把 `user-agent` 补回（最终覆盖）。

## 卸载

### 标准安装

```bash
dsh plugin --profile web remove dsh-llm-pi-ai-headers
```

官方 `llm-pi-ai` 适配器始终未被修改，卸载后恢复官方原样（`headers` 里的 `User-Agent` 会恢复为被过滤、不再注入的状态）。

### 旧版

```bash
node uninstall.mjs              # 恢复前端备份 + 还原 cordis.patch.yml
node uninstall.mjs --purge      # 同时删除插件文件
```

## 标准安装为什么升级不需要重跑

旧版把 UI 直接写进官方 `dsh-client-ui-settings-models` 的 bundle，dsh 升级后该 bundle 被新版覆盖，补丁失效。

新版把 UI 做成独立 client module：

- `dsh.client` 声明让 dsh 在浏览器侧加载 `lib/client.js`
- `lib/client.js` 注册到官方 `settings.section` 槽位，显示为设置侧边栏「模型扩展」分节（order 11，位于「模型」与「插件」之间）
- 服务端通过 `/api/dsh-llm-pi-ai-headers`（loopback-only）读写同一个 `llm-pi-ai` 设置命名空间
- 服务端只 wrap 官方 `PiAiAdapter` 的 `streamSimple`，注入 `transformHeaders` 钩子；官方适配器本体不被替换

因此 dsh 升级不会覆盖本插件的前端代码与服务端注入点；升级后通常无需任何重装操作。

## 目录结构

```
dsh-llm-pi-ai-headers/
├── package.json            # 标准 dsh 插件包声明
├── cordis.patch.yml        # 仅插入本插件，不修改官方适配器
├── lib/
│   ├── index.js            # 包入口（复用 plugin/llm-pi-ai.mjs）
│   └── client.js           # 前端「模型扩展」分节（设置侧边栏）
├── plugin/
│   └── llm-pi-ai.mjs       # 服务端注入器 + 设置桥（单文件，旧版也复制它）
├── install.mjs             # 旧版安装脚本（保留兼容，新用户勿用）
├── uninstall.mjs           # 旧版卸载脚本
└── patches/                # 旧版前端补丁片段
```

## License

MIT