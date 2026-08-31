# hi-dsh

一个 dsh 插件市场 —— 发现、收录、安装 **dsh** 插件。

`hi-dsh` 本身就是一个 dsh bundle：一个 npm 包，`package.json` 里声明了
`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。装进 profile 后，它会挂载一个
`Marketplace` Cordis 服务，供 profile 的其他表面（命令、Web UI、agent 工具）读取和扩展；
同时通过 `"dsh": { "client": … }` 声明把自己的 web 界面注入 dsh web。

> **状态：v0.4 —— 已安装管理。** 逛、搜、筛选、一键安装、已安装列表与卸载可用。英文版文档等版本稳定后再补。

## 目前的能力

- 声明合法的 dsh bundle（`dsh.bundle.patch` 标记）**和** web 客户端
  （`dsh.client` 声明，tsdown 构建为 `client/client.js` 工厂包）。
- 挂载 `Marketplace` 服务（`ctx.marketplace`）：启动时加载共享目录 feed
  （[awesome-dsh-plugin](https://awesome-dsh-plugin.com)，2500+ 插件，由其 CI 每日刷新），
  提供 `list(filter)`、`count()`、`status()`；拉取失败时回退到 `config.catalog` 并如实上报。
- Web 界面，注册在三个**增量**宿主座位上（不替换任何宿主组件）：
  - 侧栏底部的 **Hi 按钮**（`sidebar.footer.action`，官方第三方座位；
    侧栏收起时是 56px 细轨里的 36px 图标）；
  - Hi 打开的**市场面板**（`shell.overlay`）：占据侧栏右侧的整个内容区，
    侧栏保持可见；点击侧栏任意位置（会话、工作区、设置）或再点一次 Hi 即收起面板，
    Esc 同样有效；定位不到侧栏 DOM 时面板内直接显示错误信息（不做静默降级）；
  - 会话视图环里的**「插件市场」标签页**（`conversation.view`，与轨迹视图同机制）。
  市场页提供搜索、中英分类筛选、按 star/下载量/收录日期排序、滚动到底自动加载。
- **一键安装**（对齐 dsh-market 的流程与安全边界）：
  - 插件卡片点「安装」→ 确认框 →「确认安装」→ `POST /hi-dsh/install`；
  - 服务端只在 web profile（有 webServer 的宿主）注册该路由，仅接受同源 POST，
    且只安装当前目录 feed 里收录的来源；pnpm 目标从条目的结构化字段
    （npm 名 / GitHub url）推导并做字符白名单校验，绝不使用自由文本的安装命令；
  - 实际执行 `dsh plugin --profile <name> add <target>`（profile 取宿主进程的
    `--profile` 参数），安装成功后尝试**热挂载**（Include 子树，运行时即刻生效）；
    不支持热挂载的插件如实回报「重启 dsh web 后生效」及原因；
  - 失败时卡片内展示错误与 pnpm 输出尾部；安装与卸载共享单飞锁（并发请求 409）。
- **「已安装插件」标签页 + 一键卸载**（市场面板与会话标签页各有两个标签：插件市场 / 已安装插件）：
  - 安装来源**记账**：`dsh plugin` / pnpm 不记录"是谁装的"，所以安装路由在成功后把
    "通过 hi-dsh 安装"这一事实写入 `~/.dsh/profiles/<name>/hi-dsh.json`（每次写入
    都按当前依赖表修剪，依赖表始终是事实源）；
  - 已安装列表 = **账本 ∩ profile 依赖**（`GET /hi-dsh/installed`）：终端、其它市场
    装的以及 dsh 自带的框架层不会出现；功能上线前的历史安装无法追认，重装一次即可入账；
  - 列表项显示实际版本（读 `node_modules/<pkg>/package.json`）、依赖 spec、安装日期，
    能对上目录 feed 时附简介与热度（feed 不可用时如实标注，仅显示本地信息）；
  - 卸载：确认框 → `POST /hi-dsh/uninstall` → `dsh plugin --profile <name> remove <pkg>`，
    成功后删除账本条目并从列表移除；当前进程内插件仍会运行，如实提示"重启 dsh web 后
    完全停用"；pnpm 报告成功但依赖仍在时按失败处理（不伪造成功）；
  - 边界：只允许卸载账本记录的包（终端装的请用命令行管理）；拒绝在市场内卸载 hi-dsh 自身；
    账本损坏时返回可行动的错误（500），不装作空列表。
- 注册 **`/hi-dsh`** 斜杠命令，汇报目录 feed 状态（来源、数量、更新日期）。
- 启动时打印日志，确认 bundle 激活与 feed 加载结果。

装进 `web` profile 并重启 `dsh web` 后：点侧栏底部的 **Hi** 按钮打开市场，
或在会话里输入 `/hi-dsh` 查看目录状态。

## 装进 profile

```sh
dsh plugin --profile <name> add hi-dsh
```

`dsh plugin` 会把参数转发给 profile 目录里的 pnpm，然后调和 `dsh.profile.bundles`，
让声明了 `dsh.bundle` 的依赖加入层栈。`<name>` profile 必须已存在（或是可自动初始化的
`web` / `headless`）。

## 开发

```sh
# 克隆后，安装进某个 profile，或加入目录
dsh plugin --profile web add .
```

改动 `src/client/` 后重新构建浏览器端 bundle：

```sh
pnpm install   # 首次（装 tsdown）
pnpm build     # 重新生成 client/client.js
```

想看插件是否激活、而不启动完整会话，可以检查组合后的配置树：

```sh
dsh --profile web --dump-config
```

## 结构

| 路径 | 用途 |
| --- | --- |
| `package.json` | 包清单 + `dsh.bundle.patch` 与 `dsh.client` 声明。 |
| `cordis.patch.yml` | 插入 `hi-dsh` 行的 bundle 补丁层。 |
| `src/index.js` | Cordis 插件：`Marketplace` 服务（feed 拉取）+ `/hi-dsh` 命令 + 路由挂载。 |
| `src/install.js` | 三个 HTTP 路由（已安装列表 / 安装 / 卸载）、`dsh plugin` 转发、Include 热挂载、安装来源账本。 |
| `src/client/index.jsx` | 客户端入口：Hi 按钮 / 全屏市场页 / 会话标签页三个插槽注册。 |
| `src/client/MarketPage.jsx` | 市场界面：两个标签页（插件市场 / 已安装插件）、搜索、分类筛选、排序、安装确认框与安装流程。 |
| `src/client/InstalledPage.jsx` | 已安装列表：账本 ∩ 依赖的展示、卸载确认与卸载流程。 |
| `src/client/dialog.jsx` | 安装 / 卸载共用的确认对话框。 |
| `src/client/styles.js` | 客户端共享内联样式。 |
| `src/client/feed.js` | 目录 feed 拉取与页内缓存。 |
| `tsdown.config.js` | 客户端工厂包构建（`window.__ModuleLoader__.load` 包装）。 |
| `client/client.js` | 构建产物，宿主 web 端加载（连 `.map` 一起提交，便于调试）。 |

## 许可

MIT
