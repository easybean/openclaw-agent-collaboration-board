# Agent Collaboration Board MVP 字段清单与数据映射

## 一、文档目的

本文件用于把 `OpenClaw Agent Collaboration Board` 从方案阶段推进到实现阶段。

目标是明确第一版 MVP 看板到底读取哪些字段、如何归一化、如何在 Telegram 中展示。

第一版只服务一个目标：

**让 David 能看见哪些任务真的在推进，哪些任务在等，哪些任务卡住，哪些事项需要他拍板。**

---

## 二、第一版输入数据源

MVP 第一版优先读取以下数据源：

### 1. A2A Task/State 对象（主数据源）
来源：A2A Task/State 协议 v1.0

优先读取字段：
- `taskId`
- `type`
- `title`
- `status`
- `owner`
- `executor`
- `blockReason`
- `priority`
- `retryCount`
- `maxRetries`
- `createdAt`
- `updatedAt`
- `startedAt`
- `finishedAt`

### 2. ACK 状态（补充状态源）
来源：A2A 任务确认与响应机制

优先识别：
- `task sent`
- `received`
- `running`
- `blocked`
- `waiting_input`
- `waiting_approval`
- `completed`

### 3. Runtime / 项目规则派生字段（内部计算）
这些字段不要求源数据直接提供，由看板聚合层计算：
- `isActuallyProgressing`
- `progressState`
- `needsDavidAction`
- `nextActor`
- `lastActivityAt`
- `isStale`

### 4. Session / 文本消息（兜底补充）
仅在结构化 Task/State 或 ACK 信息不足时使用。

用途：
- 补最近协作摘要
- 补“谁在等谁”
- 补待拍板事项

MVP 第一版不应把 session 文本当主状态源，只作为补丁层。

---

## 三、MVP 内部统一字段

看板聚合层应统一输出以下内部结构：

```json
{
  "taskId": "string",
  "title": "string",
  "type": "collector|extractor|runtime|other",
  "owner": "string",
  "executor": "string|null",
  "status": "running|waiting_input|waiting_approval|blocked|completed|failed|cancelled|stale",
  "rawStatus": "string",
  "ackStatus": "task_sent|received|running|blocked|waiting_input|waiting_approval|completed|null",
  "blockReason": "input|approval|tool|runtime|owner|other|null",
  "priority": "low|normal|high|null",
  "lastActivityAt": "iso8601|null",
  "isActuallyProgressing": true,
  "needsDavidAction": false,
  "nextActor": "string|null",
  "summary": "string|null"
}
```

---

## 四、关键派生字段规则

## 4.1 `lastActivityAt`
优先级：
1. `updatedAt`
2. `finishedAt`
3. `startedAt`
4. `createdAt`

用于判断最近动作时间。

---

## 4.2 `isActuallyProgressing`
用于判断任务是否“真的在推进”，而不是只挂了一个 `running` 状态。

### 判定为 true 的情况
- 最近观察窗口内有新状态流转
- 有新结果回流
- `received -> running` 已发生且有后续更新
- 当前任务已进入 `completed`

### 判定为 false 的情况
- 长时间无状态变化
- 标记为 `running` 但无新动作
- 处于 waiting / blocked 且无人继续处理
- 已 `completed` 但关键结果未回流
- owner 不清或 nextActor 为空

---

## 4.3 `progressState`
第一版建议用以下值：
- `running`
- `waiting_input`
- `waiting_approval`
- `blocked`
- `completed`
- `failed`
- `cancelled`
- `stale`

### 规则
当任务原始状态是 `running`，但 `isActuallyProgressing = false` 时：

优先映射为：
- `stale`

这一步专门用于暴露“伪推进”。

---

## 4.4 `needsDavidAction`
满足任一条件时设为 `true`：
- 任务处于 `waiting_approval`
- 消息或任务字段明确标记需要 David 拍板
- owner / 优先级 / 资源问题已升级到 David
- 高风险动作待董事长确认

---

## 4.5 `nextActor`
优先识别：
1. 当前明确被指派的下一步责任人
2. 若 blocked，则识别阻塞的被依赖对象
3. 若 waiting_approval，则固定为 `David`
4. 若 waiting_input，则识别输入提供方

---

## 五、状态映射规则

## 5.1 Task/State -> 看板状态

| 原始状态 | 映射后状态 | 说明 |
|---|---|---|
| `created` | `stale` | 已创建但未正式推进 |
| `queued` | `stale` | 已入队但未真正接单 |
| `running` | `running` / `stale` | 取决于是否真实推进 |
| `blocked` | `blocked` | 保持不变 |
| `succeeded` | `completed` | 统一成 completed |
| `failed` | `failed` | 保持不变 |
| `cancelled` | `cancelled` | 保持不变 |

---

## 5.2 ACK -> 看板辅助判断

| ACK 状态 | 用途 |
|---|---|
| `task sent` | 任务已发出但未确认接住 |
| `received` | 已确认收到，但可能未开工 |
| `running` | 已接单开工 |
| `waiting_input` | 当前在等输入 |
| `waiting_approval` | 当前在等批准 |
| `blocked` | 当前卡住 |
| `completed` | 已完成并应检查是否回流 |

### 核心规则
- 有 `received` 但没有 `running`，不得视为已真实推进
- 有 `completed` 但无回流，不得视为闭环完成

---

## 六、Telegram 展示结构（第一版）

第一版 Telegram 看板固定为四块：

### 1. 最近协作
显示最近关键任务与状态变化

字段：
- 任务名
- owner
- 状态
- 最近动作时间

### 2. 当前任务
显示当前主推进任务

字段：
- 任务名
- owner
- 当前状态
- 是否真实推进
- 下一步责任人

### 3. 阻塞项
显示 blocked / waiting_input / waiting_approval / stale

字段：
- 任务名
- 当前卡点
- 正在等谁
- 是否需要 David 动作

### 4. 待拍板
显示 needsDavidAction = true 的事项

字段：
- 任务名
- 当前状态
- 需要 David 决定什么
- 下一步责任人

---

## 七、第一版实现边界

MVP 第一版：
- 优先支持 Telegram 文本看板
- 不做图形 dashboard
- 不做复杂任务编辑
- 不做完整工作流管理
- 不做复杂图数据库或事件溯源

重点先做：
1. 状态采集
2. 状态映射
3. 真实推进判断
4. Telegram 文本输出

---

## 八、建议实现拆分

### Task 1：状态采集器
读取 Task/State + ACK + 必要 session 补丁

### Task 2：状态归一化器
输出统一内部字段结构

### Task 3：真实推进判断器
计算 stale / needsDavidAction / nextActor

### Task 4：Telegram 渲染器
输出四块文本看板

---

## 九、结论

从本文件开始，`Agent Collaboration Board` 的第一版 MVP 已从“概念方案”进入“实现字段层”。

后续实现以本文件字段和映射规则为准，优先把：

**状态采集 → 状态判断 → Telegram 输出**

这条主链路做通。
