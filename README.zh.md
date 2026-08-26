# hi-dsh

一个 dsh 插件市场 —— 发现、收录、安装 **dsh** 插件。

`hi-dsh` 本身就是一个 dsh bundle：一个 npm 包，`package.json` 里声明了
`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。装进 profile 后，它会挂载一个
`Marketplace` Cordis 服务，供 profile 的其他表面（命令、Web UI、agent 工具）读取和扩展。

> **状态：骨架。** 本包目前只提供可支撑的宿主形态。真正的发现能力（curated 目录、
> 远端 feed、或对声明了 `dsh.bundle` 的包做 npm registry 扫描）、搜索、安装动作，
> 属于下一个里程碑。

## 目前的能力

- 声明了合法的 dsh bundle（`dsh.bundle.patch` 标记）。
- 挂载 `Marketplace` 服务（`ctx.marketplace`），提供 `list(filter)` 目录查找和 `count()`。
- 注册 **`/hi-dsh`** 斜杠命令，回答占位文本 `功能更新中，敬请期待`
  （在 Web 界面的命令列表里可见）。
- 启动时打印一行日志，确认 bundle 在 boot 时被激活。

装进 `web` profile 之后，在会话里输入 `/hi-dsh` 就能看到占位文本。

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

想看插件是否激活、而不启动完整会话，可以检查组合后的配置树：

```sh
dsh --profile web --dump-config
```

## 结构

| 路径 | 用途 |
| --- | --- |
| `package.json` | 包清单 + `dsh.bundle.patch` 标记。 |
| `cordis.patch.yml` | 插入 `hi-dsh` 行的 bundle 补丁层。 |
| `src/index.js` | Cordis 插件：`Marketplace` 服务 + 默认导出。 |

## 许可

MIT
