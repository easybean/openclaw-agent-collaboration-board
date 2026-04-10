# Agent 状态层（第一版）

## 一、文档目的

本文件定义 `Agent Collaboration Board` 第一版必须补上的 **Agent 状态层**。

目标不是只看任务，而是回答一个更直接、更管理层的问题：

> 当我给某个 agent 发消息，他没回时，我怎么知道他是在干活、在等待、卡住了，还是已经失活？

---

## 二、为什么这一层必须有

仅有任务看板，不足以解决以下问题：
- agent 不回消息，不知道是不是收到了
- agent 不回消息，不知道是不是仍在运行
- agent 最近有协作痕迹，但不知道当前是否还活跃
- 无法区分“正在处理”与“已经静默”

因此第一版必须补一个 **Agent 当前主状态层**。

---

## 三、第一版字段

每个 agent 至少输出：
- `agentId`
- `lastSessionUpdateAt`
- `lastStructuredSignalAt`
- `lastAckStatus`
- `currentState`
- `currentTaskSummary`
- `isStale`
- `isLikelyAlive`

---

## 四、第一版状态定义

### `running`
最近有明确协作状态信号，且内容显示正在推进。

### `waiting`
最近有明确协作状态信号，但当前显示为 waiting_input / waiting_approval。

### `blocked`
最近有明确 blocked 信号。

### `completed`
最近最新信号显示 completed，且暂无新任务覆盖。

### `stale`
最近长时间没有新的明确推进动作，或只有旧痕迹，没有新响应。

### `unknown`
当前没有足够信号判断。

---

## 五、第一版判断原则

### `isLikelyAlive = true`
满足任一：
- 最近 session 文件有更新
- 最近有明确 structured signal
- 最近有 ACK / completed / running / blocked / waiting 信号

### `isStale = true`
满足任一：
- 最近窗口内没有新 structured signal
- 当前只有旧 completed，没有后续动作
- 当前没有明确下一步，也无新回执

---

## 六、第一版展示目标

这一层要优先回答：
- 这个 agent 最近有没动静
- 最近一次明确状态是什么
- 当前更像在推进、在等、卡住，还是发呆
- 如果他不回消息，我要不要继续等，还是该追、该升级

---

## 七、与任务板的关系

- **任务板** 解决：事情在不在推进
- **Agent 状态层** 解决：人（agent）现在像不像还在工作

两层都需要，不能互相替代。
