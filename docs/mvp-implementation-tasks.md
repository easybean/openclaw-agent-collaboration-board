# Agent Collaboration Board MVP 实现任务单

## 一、文档目的

本文件用于把 `OpenClaw Agent Collaboration Board` 的 MVP 实现工作正式拆成可执行任务单。

目标是让项目从“方案/字段层”进入“工程实现层”，明确：
- 每个任务做什么
- 产出什么
- 依赖什么
- 完成标准是什么

---

## 二、MVP 实现主链路

第一版实现主链路固定为：

1. **状态采集**
2. **状态归一化**
3. **真实推进判断**
4. **Telegram 文本渲染**

只要这条链打通，第一版看板就能跑起来。

---

## 三、任务单

# Task 1：状态采集器（State Collector）

## 任务目标
从可用数据源中采集 MVP 看板所需的原始状态数据。

## 输入来源
优先级如下：
1. A2A Task/State 对象
2. ACK 状态
3. 必要 session history 补丁

## 关键工作
- 读取 Task/State 主字段
- 读取 ACK 关键状态
- 识别最近活动时间
- 在结构化数据不足时，允许最小量 session 文本补丁

## 产出
输出原始采集结果对象列表，至少包含：
- `taskId`
- `title`
- `type`
- `owner`
- `executor`
- `status`
- `ackStatus`
- `blockReason`
- `createdAt`
- `updatedAt`
- `startedAt`
- `finishedAt`
- `summary`

## 依赖
- A2A Task/State v1.0
- ACK 机制

## 完成标准
- 能稳定产出一批原始任务状态对象
- 不依赖人工解释才能读懂
- 结构化字段优先，不把 session 文本当主状态源

---

# Task 2：状态归一化器（State Normalizer）

## 任务目标
把不同来源的原始状态统一映射成看板内部结构。

## 关键工作
- 统一状态值
- 统一 owner / executor 语义
- 统一 ACK 状态表达
- 统一时间字段优先级
- 生成标准内部对象

## 目标结构
统一输出：
- `taskId`
- `title`
- `type`
- `owner`
- `executor`
- `status`
- `rawStatus`
- `ackStatus`
- `blockReason`
- `priority`
- `lastActivityAt`
- `summary`

## 依赖
- Task 1 输出
- `docs/agent-collaboration-board-mvp-fields-and-mapping.md`

## 完成标准
- 同类任务无论来源如何，映射后字段一致
- `running / blocked / completed / stale` 等关键状态可直接被渲染器使用
- owner / executor 不混淆

---

# Task 3：真实推进判断器（Progress Evaluator）

## 任务目标
识别任务是否真的在推进，并标出假推进、静默挂起、待拍板等管理关键状态。

## 关键工作
- 计算 `isActuallyProgressing`
- 识别 `stale`
- 计算 `needsDavidAction`
- 识别 `nextActor`
- 判断 completed 后是否已回流

## 重点规则
### 判定为真实推进
- 最近窗口内有新动作
- 有新状态流转
- 有新结果回流
- 下一步已被接住并进入执行

### 判定为未真实推进
- `running` 但无新动作
- waiting / blocked 状态悬空
- completed 但无回流
- owner 不清
- nextActor 不清

## 输出补充字段
- `isActuallyProgressing`
- `progressState`
- `needsDavidAction`
- `nextActor`
- `isStale`

## 依赖
- Task 2 输出
- Runtime Lead 定时状态板规则

## 完成标准
- 能把“表面 running、实际上没动”的任务识别出来
- 能把需要 David 动作的事项显式标出
- 输出可直接被 Telegram 看板消费

---

# Task 4：Telegram 渲染器（Telegram Board Renderer）

## 任务目标
把归一化并判断后的任务状态，输出成第一版 Telegram 文本看板。

## 输出结构
固定为四块：
1. 最近协作
2. 当前任务
3. 阻塞项
4. 待拍板

## 每块最小字段
### 最近协作
- 任务名
- owner
- 状态
- 最近动作时间

### 当前任务
- 任务名
- owner
- 当前状态
- 是否真实推进
- 下一步责任人

### 阻塞项
- 任务名
- 当前卡点
- 正在等谁
- 是否需要 David 动作

### 待拍板
- 任务名
- 当前状态
- 需要 David 决定什么
- 下一步责任人

## 关键要求
- 第一版只做 Telegram 文本输出
- 不用表格依赖复杂 UI
- 信息要短，但必须足够暴露真实状态

## 依赖
- Task 3 输出

## 完成标准
- 在 Telegram 中一眼可读
- 能让 David 快速看见：
  - 谁在推进
  - 谁在等
  - 谁卡住
  - 哪些事项要拍板

---

## 四、建议执行顺序

### 顺序
1. Task 1：状态采集器
2. Task 2：状态归一化器
3. Task 3：真实推进判断器
4. Task 4：Telegram 渲染器

### 原因
这是最短主链路，能最快把第一版跑起来。

---

## 五、建议角色分工

### 洪七公
- 技术方案 owner
- 状态模型与映射规则收口

### 杨过
- A2A Task/State 协议支持
- 深技术实现边界支持

### 一灯大师
- Runtime 状态规则
- 真实推进 / stale / 回流判断支持

### 黄蓉
- 执行拆解与推进节奏

---

## 六、结论

从本任务单开始，`Agent Collaboration Board` 的 MVP 已具备明确的工程拆解。

后续推进不再停留在“讨论做什么”，而进入：

**按任务单逐项实现。**
