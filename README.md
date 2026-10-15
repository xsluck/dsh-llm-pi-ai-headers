# dsh-llm-pi-ai-headers

让 dsh 支持**按提供商配置自定义请求头**、**Key 轮询（Round-Robin 多 Key 轮换）**，同时**保留官方 `llm-pi-ai` 适配器**。

旧版插件会禁用并替换官方适配器，因此必须自己解析 SSE 流，承担了参数截断 400、`reasoning_content` 回传等契约风险。本版本改为 B 方案：官方适配器完全保留（流解析、reasoning 回传、工具调用、上下文窗口判定等全部由官方 pi-ai 处理），本插件只做两件事——把官方适配器因 attribution 保留名过滤而丢掉的 `user-agent` 在请求最后一层补回去；按配置轮询多个 API Key 注入指定请求头。

典型用途：
- OpenCode Zen 免费层会拒绝非 opencode 的 `User-Agent`（HTTP 429/403）。装上本插件后，给 `opencode` 提供商加一条 `User-Agent: opencode/1.18.18` 即可稳定使用。
- 同一提供商配置多个 API Key，插件按 Round-Robin 自动轮询，突破单 Key 限流。

## 功能

- **按提供商配置请求头**：编辑器出现在设置侧边栏「模型扩展」分节（位于「模型」与「插件」之间）
- **Key 轮询（Round-Robin）**：为同一提供商配置多个 API Key，每次请求按顺序轮询选取下一个注入指定请求头（默认 `Authorization`），适用于多 Key 限流轮换场景
- **按提供商配置重试策略**：同一分节可编辑官方 `retryPolicy`——模式（限次数/无限重试）、最大重试次数、可重试错误码（中文标签多选 + 自定义错误码）、退避参数（初始延迟/最大延迟/抖动比例），并支持一键恢复默认
- **配置入口保持官方原样**：写的是官方 `llm-pi-ai.providers.<route>.headers` / `.retryPolicy` 字段，`settings.yaml` 手写与 UI 编辑完全等价；Models 页面、设置页面均为官方原样
- **User-Agent 自动补回**：官方适配器把 `user-agent` 当作 attribution 保留头过滤掉（`requestHeaders()`），本插件在底层 pi-ai 的 `transformHeaders` 钩子（所有头合并完成之后）把它补进最终请求头；其余自定义头官方原样发送
- **模型级思考强度（reasoning effort）**：同一分节里按提供商展开模型列表，**逐模型**配置推理档位（不配置=继承 / 不支持推理 / 自定义档位 + 每档线上写法）。写的是官方 `providers.<route>.models[].reasoningEfforts`，并自动补 `compat`（`thinkingFormat` / `supportsReasoningEffort` / 非官方域名的 `supportsDeveloperRole:false`）——少了最后这一项，模型一旦声明推理档位，系统提示词 role 会从 `system` 变成 `developer`，多数自建网关直接 400
- **模型级容量与支持类型**：同一行里还能编辑官方 `modelFields` 的另外三项——`contextWindow`（上下文长度）、`maxTokens`（最大输出）、`input`（支持类型：文本/图片），与档位一样自动识别、只预填、手动保存
- **三层自动识别**：① 该提供商自己的 `/models` 探测（host 代理、复用 Key 池鉴权，最权威）② 公共目录（OpenRouter / models.dev / LiteLLM，按需拉取 + 7 天落盘缓存，离线自动降级）③ 内置名字知识库（覆盖中转改写的 id，如裸 `k3`、`hy4-preview-f`）。冲突时按 ①>②>③ 取值，每条建议标明来源与置信度
- **识别结果只预填、不自动落盘**：打开分节时把建议预填成待保存状态，必须点「保存」才写入；已声明的模型绝不自动改
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
dsh plugin --profile web add "github:xsluck/dsh-llm-pi-ai-headers#v0.3.0"
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

5. **Key 轮询：自动启用**。在「模型」页为该提供商保存的主 Key 会自动作为轮询池的 **1 号位**，无需在这里重复粘贴。只需追加额外 Key，它们依次排在主 Key 之后；请求头默认 `Authorization`。自定义请求头与本功能互不干扰
6. 如需调整失败重试：在下方「重试策略」区修改模式/次数，用中文标签**勾选**可重试错误码（可另填自定义码），并调整退避参数（默认限次数 2 次，可一键恢复默认）
7. **思考强度**：在「思考强度（模型级）」区逐个模型选择三态之一——`不配置（继承）` / `不支持推理` / `自定义档位`；自定义时勾选档位（`off`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`）并填每档的**线上写法**（`off` 留空 = 不传参数；填 `none` = 发 `reasoning_effort: none`）。每行会显示建议来源徽标与「用建议填充」按钮
8. 需要自动识别时点「**自动识别本提供商**」（联网探测该网关的 `/models`）或「**更新外部目录**」（拉取三个公共目录，约 9 MB，缓存 7 天）；识别结果只预填，仍需保存才生效
9. **容量与类型**：同一模型行下方可编辑 `上下文长度` / `最大输出` / `支持类型`（文本、图片）；留空 = 不声明（用官方默认），输入框的 placeholder 会显示识别到的建议值，点「用建议填充」一次写入三项
10. 保存

请求头合并顺序：官方 `attributionHeaders`（身份头）→ `Authorization` → `headers`（settings.yaml / UI 写入，官方原样发送，其中 `user-agent` 被官方过滤）→ 本插件 `transformHeaders` 把 `user-agent` 补回 + Key 轮询注入（最终覆盖）。轮到主 Key 时插件**不**改写认证头，官方适配器按 `apiKeyEnv` 从凭据库取值。

### Key 轮询（主 Key 自动入池）

只要提供商在「模型」页配好主 Key（`apiKeyEnv`），该提供商就**已经**处于轮询状态——1 号位是那把主 Key。在扩展页追加的 Key 依次排队：

```yaml
# settings.yaml 等价写法（也可通过 UI 配置）
llm-pi-ai:
  providers:
    my-provider:
      apiKeyEnv: MY_PROVIDER_API_KEY   # 模型页保存的主 Key = 轮询池 1 号位
      keyPool:
        headerName: Authorization      # 注入的请求头名，默认 Authorization
        keys:                          # 追加的 Key，排在主 Key 之后
          - "sk-key-bbb-second"
          - "sk-key-ccc-third"
```

请求顺序：第 1 次 → 主 Key（凭据库），第 2 次 → `sk-key-bbb`，第 3 次 → `sk-key-ccc`，第 4 次 → 主 Key……

- **主 Key 不落盘**：`settings.yaml` 里只有 `apiKeyEnv` 引用名，主 Key 本身始终留在凭据库；轮询轮到它时插件跳过注入，走官方 auth 通路。
- **想关掉轮询**：取消勾选并保存会写入 `keyPool.enabled: false`（显式关闭，而不是删除配置，重新勾选即恢复）。
- 只有追加 Key、没有模型页主 Key 的提供商同样可用（池子就是这些 Key）。

### 额度耗尽自动暂停 / 自动回池

服务端返回 `429 {"code":"1310","message":"您已达到每周/每月使用上限，您的限额将在 2026-09-09 21:15:14 重置。"}` 这类额度错误时：

1. 插件把它归类为 `QUOTA`（识别中文「使用上限 / 额度 / 配额 / 限额 / 余额」等文案），而不是临时的 `RATE_LIMIT`
2. 该 Key **立即移出轮询**，后续请求只在剩下的 Key 之间轮转
3. 解析消息里的重置时间；到点**自动回池**，无需重启、无需人工操作
4. 消息里没有重置时间时按默认 1 小时冷却；重置时间已过去（如重试旧错误）则立即可用
5. 全部 Key 都在冷却时，仍会选出最早解冻的那把发出请求（宁可试一次，也不让请求无声失败）
6. 该 Key 之后请求成功 → 冷却与疑似标记立即清除（误判自愈）

> ⚠️ 注意：`keyPool.keys` 以**明文**存储在 `~/.dsh/settings.yaml`（官方 schema 仅对 `apiKeyEnv` 走凭据服务，未知字段不参与脱敏）。因此**建议把主 Key 留在模型页**（走凭据库），只把额外的备用 Key 填在这里；请确保该文件访问权限受控。

### Key 健康度（坏 Key 定位）

某个 Key 失效（凭据无效 / 额度耗尽 / 限流）时无需猜：

- **服务端日志**：立即打 WARN，含脱敏 Key 与序号——`key #2 (Bearer…ab1f) on "my-provider" failed with INVALID_CREDENTIAL — check/replace this key`；额度类失败额外说明何时自动回池
- **UI 健康面板**：「模型扩展」→ Key 轮询卡片下方显示每个 Key 的 调用数 / 失败数 / 最后错误码；疑似失效的 Key 红框高亮 + ⚠️ 标记，等待回池的 Key 显示 `冷却至 <时间>`
- **错误码含义**：`INVALID_CREDENTIAL` = Key 已失效；`QUOTA` = 额度耗尽（自动冷却并定时回池）；`RATE_LIMIT` = 限流（通常无需处理）
- **失败来源都记账**：抛出的异常与 pi-ai 的流内 `error` 事件（额度类失败的常见下发方式）都会被记录

下一次请求会自动轮到下一个 Key，因此单个坏 Key 通常只表现为延迟略增；健康面板告诉你该换哪个。主 Key 的失败也会记账，但它的值永不外泄——面板里只显示「模型页主 Key」标签。修复或删除追加 Key 并保存后统计自动清零。

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