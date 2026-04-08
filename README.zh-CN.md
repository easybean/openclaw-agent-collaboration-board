# OpenClaw Agent Collaboration Board

面向多 Agent 执行场景的轻量级协作可观测性插件。

## 项目简介

OpenClaw Agent Collaboration Board 是一个面向 OpenClaw 的轻量级协作状态看板插件。
它主要解决 solo founder 在多 Agent 协作时最难看清的几个问题：

- 哪些 Agent 真的在推进
- 哪些任务其实在等待
- 哪些任务已经卡住
- 哪些事项需要创始人拍板

第一版不追求复杂图形界面，而是先把 **Telegram 文本状态板** 做到可用。

## 为什么要做

在多 Agent 协作里，聊天记录是可见的，但执行状态经常不可见。
这会带来几个很烦的问题：

- Agent 说“在做”，但实际上在等
- 任务做完了，但没有回流
- 任务卡住了，但没人升级
- 创始人需要自己翻长对话，才能判断真实进度

这个项目的目标，就是把这些状态变得：
- 可见
- 可判断
- 可追踪
- 可快速阅读

## MVP 目标

第一版 MVP 重点解决四件事：

1. **最近协作**
2. **当前任务**
3. **阻塞项**
4. **待拍板事项**

它的目标不是一开始就做成完整工作流产品，
而是先做好一个真正有用的协作可观测层。

## MVP 范围

### 第一版包含
- Telegram 文本看板
- Task/State 聚合
- ACK 感知的协作状态
- Runtime 视角的状态解释
- `stale` 假推进识别
- `needsDavidAction` 待拍板项暴露

### 第一版不包含
- 图形化 dashboard
- 拖拽式工作流管理
- 重交互任务编辑
- 完整事件溯源系统
- 高阶 lease / dead-letter / compensation 机制

## 核心理念

### 1. Task/State 是主状态源
看板不能只看聊天消息。
它应该优先读取结构化的任务状态。

### 2. ACK 机制很重要
消息送达，不等于任务被接住。
看板需要知道一个任务现在是：
- 已发出
- 已收到
- 已开工
- 已阻塞
- 在等待
- 已完成

### 3. Runtime 真相比乐观措辞更重要
一个任务即使显示为 `running`，如果长时间没有新动作、没有结果、没有下一步责任人，它也可能实际上是 `stale`。

### 4. 创始人要看到的是管理真相，不是消息堆积
看板不是为了重放聊天记录。
而是为了暴露：
- 什么在动
- 什么在等
- 什么卡住了
- 什么需要拍板

## 架构

MVP 主链路为：

1. **Collector**
   - 采集 Task/State
   - 采集 ACK 状态
   - 必要时用 session 文本兜底

2. **Normalizer**
   - 把不同来源的状态统一映射成内部结构

3. **Evaluator**
   - 判断是否真实推进
   - 识别 stale
   - 识别阻塞项与待拍板事项

4. **Renderer**
   - 输出 Telegram 友好的文本看板

## 关键概念

### `owner`
对任务结果负责的人或角色。

### `executor`
当前实际执行任务的人或角色。

### `stale`
表面看似在进行，但实际上没有真实推进的任务。

### `needsDavidAction`
需要创始人做拍板、批准或优先级决策的事项。

## 示例输出

见：
- [`examples/telegram-output.md`](examples/telegram-output.md)
- [`examples/demo-output.txt`](examples/demo-output.txt)

## 当前项目状态

当前仓库已包含：

- 产品方案
- 技术方案
- MVP 字段映射
- MVP 实现任务拆解
- GitHub 仓库初始化
- 第一版可跑 demo 数据流
- 第一版真实 session 数据采集入口

项目已经从概念讨论阶段，进入 MVP 实现阶段。

## 文档入口

当前文档包括：

- [`docs/plugin-plan.md`](docs/plugin-plan.md)
- [`docs/technical-design.md`](docs/technical-design.md)
- [`docs/mvp-fields-and-mapping.md`](docs/mvp-fields-and-mapping.md)
- [`docs/mvp-implementation-tasks.md`](docs/mvp-implementation-tasks.md)

## 安装

当前项目仍处于早期实现阶段，尚未作为可安装插件发布。

目前可先：
1. clone 仓库
2. 阅读 `docs/`
3. 用 `src/` 中的 MVP 骨架继续推进实现

```bash
git clone git@github.com:easybean/openclaw-agent-collaboration-board.git
cd openclaw-agent-collaboration-board
```

## 开发

当前目录结构：
- `src/collector`：状态采集
- `src/normalizer`：统一映射
- `src/evaluator`：真实推进 / stale / 待拍板判断
- `src/renderer`：Telegram 文本渲染

当前 npm scripts 仍以占位和 demo 为主。

```bash
npm install
npm run demo
npm run real-demo
```

现阶段 docs 仍然是主要真相源，开发实现应优先对齐：
- `docs/technical-design.md`
- `docs/mvp-fields-and-mapping.md`
- `docs/mvp-implementation-tasks.md`

## 路线图

### 近期
- 强化真实任务识别规则
- 接入更可靠的 A2A / ACK / Task 状态抽取
- 产出第一版真实可用的 Telegram 状态板

### 后续
- 更强的 session fallback 抽取
- 更丰富的 stale / blocker 判断规则
- Telegram 之外的更多渠道
- 更强的协作预警与可观测性机制

## 项目状态

仓库目前处于早期构建阶段。
第一阶段目标是先把 Telegram 文本看板做成真实可用的创始人管理面板。

## License

MIT
