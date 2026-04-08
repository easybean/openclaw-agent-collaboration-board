# OpenClaw Agent Collaboration Board 插件产品方案（第一版）

## 一、项目名称

**OpenClaw Agent Collaboration Board**

中文可称：
- Agent 协作看板插件
- 多 Agent 运行观察插件
- A2A 协作指挥台插件

当前建议先使用英文项目名，便于后续 GitHub 开源与社区沟通。

---

## 二、项目定位

这是一个面向 **OpenClaw 多 Agent 场景** 的可观测性与协作看板插件。

它的核心目标不是替代 OpenClaw 核心 runtime，也不是做完整项目管理系统，而是：

**把分散在 session、inter-session message、任务状态、文档产出里的协作过程，汇总成一个可查看、可追踪、可回溯的协作视图。**

一句话：

**让 owner 看见 Agent 在怎么协作、卡在哪里、结果去了哪里。**

---

## 三、为什么做这个插件

当前多 Agent 协作存在几个现实问题：

1. session 分散，过程难统一查看
2. inter-session message 有，但太碎
3. 想知道谁在做什么，没有统一视图
4. 想知道哪里卡住，要翻很多上下文
5. 想知道哪些结果该自己拍板，没有集中入口

这些问题在单 Agent 阶段还不明显，在多 Agent 协作阶段会迅速放大。

因此，这个插件本质上是在补一块：

**多 Agent 协作可观测性层。**

---

## 四、目标用户

### 第一阶段目标用户
1. 一人公司 / 单 owner 用户
2. 正在使用多个 Agent 的 OpenClaw 用户
3. 希望在 Telegram / Webchat 中直接查看协作状态的用户

### 第二阶段潜在用户
1. 小团队多 Agent 实验者
2. OpenClaw 社区高级用户
3. 需要 A2A 任务观察能力的插件开发者

---

## 五、核心价值

插件要解决的不是“更炫的 UI”，而是以下核心价值：

### 1. 看见协作过程
知道最近哪些 Agent 在互相协作。

### 2. 看见任务状态
知道当前有哪些任务在 running / blocked / waiting_approval / completed。

### 3. 看见阻塞点
知道哪条链路卡住了，卡在哪一层。

### 4. 看见结果回流
知道哪些事情已经完成、哪些结果需要 owner 处理。

### 5. 降低 owner 的路由负担
让 David 不需要自己在多个 session 里来回翻找上下文。

---

## 六、产品边界

## 6.1 本插件要做的事
- 聚合 Agent 协作事件
- 展示任务与状态摘要
- 展示阻塞项
- 展示结果回流
- 提供 Telegram 等入口的查询能力

## 6.2 本插件暂时不做的事
- 不替代 OpenClaw 的核心 runtime
- 不实现完整项目管理系统
- 不负责最终 A2A 编排引擎
- 不管理真实人员协作流程
- 不做重量级可视化工作流编辑器

---

## 七、MVP（第一版）功能范围

第一版只做最小可用闭环。

## 7.1 最近协作流
展示最近的 Agent-to-Agent 协作事件，例如：
- 洪七公 → 程英：Runtime Lead 招聘定义
- 程英 → 洪七公：候选人筛选结果
- 黄蓉 → 洪七公：流程收口
- 杨过 → 洪七公：架构反馈

### 最低展示字段
- 时间
- from
- to
- 类型（delegate / consult / report / notify）
- 摘要

---

## 7.2 当前活跃任务视图
展示当前处于活跃状态的任务。

### 最低展示字段
- taskId
- title / goal
- owner
- from / to
- priority
- status
- lastUpdatedAt

---

## 7.3 阻塞项视图
聚焦以下状态：
- blocked
- waiting_input
- waiting_approval
- failed

### 最低展示字段
- taskId
- blocker 类型
- 当前影响
- 建议升级对象 / 责任方

---

## 7.4 结果回流视图
展示最近完成的任务和关键产物。

### 最低展示字段
- taskId
- status=completed
- 输出摘要
- 是否产出文档
- 是否需要 David 拍板

---

## 7.5 Telegram 查询入口
第一版优先支持 Telegram 文本查询。

### 建议查询入口
- 看板
- 最近协作
- 当前任务
- 阻塞项
- 待拍板

### 返回形式
文本摘要，不做复杂图形界面。

---

## 八、数据来源设计

第一版不强依赖重构 OpenClaw 核心，而采用兼容式方案。

## 8.1 数据来源优先级
1. session history
2. inter-session message
3. 任务模板消息（taskId / status / owner）
4. docs / 产出文件记录（后续可选）

## 8.2 第一版建议做法
采用：

**消息通道 + 任务模板 + 状态字段提取**

也就是：
- transport 继续使用现有消息机制
- 在上层抽取 taskId / type / status / owner / summary
- 做聚合与展示

---

## 九、建议的数据模型

## 9.1 协作事件模型（Event）

```json
{
  "id": "evt_001",
  "timestamp": "2026-04-07T18:00:00+08:00",
  "from": "hongqigong",
  "to": "chengying",
  "type": "delegate",
  "summary": "委派 Runtime Lead 候选筛选",
  "taskId": "runtime-lead-001"
}
```

## 9.2 任务模型（Task）

```json
{
  "taskId": "runtime-lead-001",
  "title": "Runtime Lead 候选人筛选",
  "owner": "chengying",
  "from": "hongqigong",
  "to": "chengying",
  "status": "running",
  "priority": "P1",
  "blocker": null,
  "lastUpdatedAt": "2026-04-07T18:05:00+08:00"
}
```

## 9.3 结果模型（Result）

```json
{
  "taskId": "runtime-lead-001",
  "status": "completed",
  "summary": "已完成候选人排序，推荐一灯大师",
  "artifacts": [
    "docs/runtime-lead-agent-role-definition.md"
  ],
  "needsOwnerDecision": true
}
```

---

## 十、交互设计（Telegram 第一版）

## 10.1 文本看板示例

```text
【Agent 协作看板】

活跃任务：
1. runtime-lead-001
   owner: 程英
   status: running
   priority: P1

2. a2a-protocol-002
   owner: 洪七公
   status: completed

当前阻塞：
- 无

最近协作：
- 洪七公 → 程英：Runtime Lead 候选筛选
- 程英 → 洪七公：提交候选排序
- 黄蓉 → 洪七公：流程收口

待 David 拍板：
- Runtime Lead 候选结论
```

## 10.2 第一版不做的交互
- 不做复杂 inline workflow 管理
- 不做图形拖拽
- 不做重度 dashboard 页面

---

## 十一、分阶段实施方案

## 阶段 1：产品方案与协议对齐
目标：
- 明确插件边界
- 明确事件、任务、结果模型
- 明确 Telegram 查询方式

交付：
- 本方案文档
- 与 A2A 协议对齐

## 阶段 2：MVP 文本看板
目标：
- 能展示最近协作流
- 能展示活跃任务
- 能展示阻塞项
- 能展示待拍板事项

交付：
- Telegram 可查询的文本版看板

## 阶段 3：状态增强
目标：
- 引入更稳定的 taskId / status 抽取
- 提升 blocked / waiting_approval 的识别准确率

交付：
- 更像任务系统的协作视图

## 阶段 4：插件化与开源准备
目标：
- 抽象出插件结构
- 准备 README、安装说明、roadmap
- 形成 GitHub 项目

交付：
- 开源仓库初版

---

## 十二、为什么这个项目值得做

这个项目既解决 David 当前的实际问题，也具备 OpenClaw 社区价值。

它是一个很好的切入点，因为它同时满足：
- 自己马上能用
- 设计上有普适性
- 不必改动 OpenClaw 核心 too much
- 能自然演进成插件与开源项目

---

## 十三、当前结论

本项目正式按插件立项。

当前建议路径为：

**先按插件思路设计 → 先做 Telegram 可用 MVP → 再抽象成 OpenClaw 插件 → 再开 GitHub 项目。**

这是当前最稳、最有价值的推进方式。
