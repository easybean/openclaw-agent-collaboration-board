# OpenClaw Agent Collaboration Board 技术方案（第一版）

## 一、文档目的

本文件用于定义 **OpenClaw Agent Collaboration Board** 的第一版技术实现思路。

目标是先做一个 **Telegram 可用的 MVP**，让 owner 能看到：
- 最近协作
- 当前任务
- 阻塞项
- 待拍板事项

本方案坚持：
- 不重写 OpenClaw 核心 runtime
- 优先复用现有 session / inter-session / 模板化任务信息
- 先做文本摘要板，不做复杂图形界面

---

## 二、第一版技术目标

### 2.1 MVP 输出目标
在 Telegram 中支持输出一版结构化“协作看板”，至少包含：
1. 最近协作流
2. 当前任务
3. 阻塞项
4. 待拍板事项

### 2.2 MVP 技术目标
- 能从现有 session 与 inter-session message 中抽取协作事件
- 能识别最小状态集
- 能汇总成统一文本摘要
- 能通过 Telegram 查询触发查看

---

## 三、总体技术路径

第一版采用：

**现有消息机制 + 规则抽取 + 轻量聚合 + 文本输出**

即：
1. 读取 session history / inter-session message
2. 识别协作事件、任务状态、阻塞信号、待拍板信号
3. 转成统一内部结构
4. 生成 Telegram 文本看板

不引入重型数据库，不引入复杂前端，不要求实时图形刷新。

---

## 四、数据来源

## 4.1 第一优先级来源
1. `sessions_history` 可读到的会话记录
2. inter-session message 元信息
3. 已经模板化的 A2A 消息
4. docs 产出（后续可选）

## 4.2 当前可利用的信号

### A. 协作事件信号
可通过以下模式抽取：
- `sourceSession=... sourceTool=sessions_send`
- session 中明确的 delegate / consult / report / notify 文本模板
- from / to agent 的自然语言委派消息

### B. 任务状态信号
可通过以下关键词或模板抽取：
- pending
- running
- blocked
- waiting_approval
- completed
- failed

### C. 待拍板信号
可通过以下内容判定：
- 文本中显式出现“需要 David 拍板 / 决定 / 批准”
- 状态为 `waiting_approval`
- 输出中带 `needsOwnerDecision = true`（若后续引入）

---

## 五、第一版最小状态枚举

第一版建议统一映射为 5 个用户可读状态：

1. **待开始**
2. **进行中**
3. **阻塞中**
4. **待拍板**
5. **已完成**

### 5.1 映射建议
| 原始信号 | 看板状态 |
|---|---|
| pending | 待开始 |
| running | 进行中 |
| blocked / waiting_input / failed | 阻塞中 |
| waiting_approval | 待拍板 |
| completed | 已完成 |

这样第一版不会因为状态太细而把看板做乱。

---

## 六、MVP 字段设计

## 6.1 协作事件字段
- timestamp
- fromAgent
- toAgent
- eventType
- summary
- taskId（可空）

## 6.2 当前任务字段
- taskId
- title / goal
- owner
- fromAgent
- toAgent
- status
- priority（可空）
- lastAction
- lastUpdatedAt

## 6.3 阻塞项字段
- taskId
- blockerType
- impactSummary
- suggestedResolver
- currentStatus

## 6.4 待拍板字段
- taskId
- title
- decisionNeeded
- submittedBy
- currentImpact

---

## 七、规则抽取策略

第一版不追求完美 NLP，采用 **规则优先**。

## 7.1 协作流抽取
识别条件：
1. inter-session message
2. 来自不同 agent session 的明确协作文本
3. 命中 task 模板 / delegate / consult / report / notify 模板

输出：
- recent collaboration events

## 7.2 当前任务抽取
第一版当前任务可由以下事件推断：
- 新任务被委派但未完成
- 明确标记 running / pending / blocked / waiting_approval 的事项
- 最近 24h 内仍有状态变化的 taskId 事项

## 7.3 阻塞项抽取
命中以下任一条件即进入阻塞项池：
- 状态为 blocked
- 状态为 waiting_input
- 出现“卡点 / 阻塞 / 缺输入 / 缺权限 / 工具失败 / timeout”
- 明确描述“尚未落地 / 未开始 / 无法继续”且带 owner

## 7.4 待拍板抽取
命中以下任一条件即进入待拍板池：
- 状态为 waiting_approval
- 文本中明确要求 David 决定/批准/拍板
- 结果已形成但下一步依赖董事长确认

---

## 八、Telegram 输出结构

第一版输出结构建议固定为：

```text
【Agent 协作看板】

一、待拍板
...

二、阻塞项
...

三、当前任务
...

四、最近协作
...
```

### 8.1 排序建议
按 owner 价值排序：
1. 待拍板
2. 阻塞项
3. 当前任务
4. 最近协作

原因：owner 最先关心的是自己要不要动作，其次才是过程。

### 8.2 截断策略
- 每个分区默认展示 Top 3~5
- 超出部分写“更多略”
- 第一版优先可读性，不追求全量铺开

---

## 九、触发机制

第一版先不做复杂自动刷新。

## 9.1 第一阶段触发方式
### 手动触发
用户在 Telegram 中输入：
- 看板
- 当前任务
- 阻塞项
- 待拍板
- 最近协作

### 关键事件触发（后续可选）
- 新阻塞出现
- 新待拍板出现
- 重要任务 completed

第一版建议：
**手动触发优先，关键事件触发延后。**

---

## 十、实现分层建议

## 10.1 Collector
负责：
- 读取 session history
- 收集 inter-session message
- 采集原始事件

## 10.2 Extractor
负责：
- 规则解析
- taskId / status / owner / blocker 抽取
- 文本归类

## 10.3 Normalizer
负责：
- 状态映射
- 统一字段结构
- 去重与时间排序

## 10.4 Renderer
负责：
- 把内部结构转成 Telegram 文本看板
- 控制分区、排序、截断、摘要长度

---

## 十一、第一版技术边界

### 做
- 规则抽取
- 文本看板
- 基于现有 session 的兼容方案
- MVP 级别状态映射

### 不做
- 全自动精准任务识别
- 重度实时同步
- 图形仪表盘
- 完整项目管理系统
- OpenClaw 核心 runtime 改造

---

## 十二、已知风险

### 风险 1：现有消息结构不够统一
影响：抽取规则会脆弱
应对：推动 A2A 模板化

### 风险 2：任务状态缺少统一 taskId
影响：当前任务识别不稳定
应对：逐步要求关键协作携带 taskId

### 风险 3：自然语言太散
影响：阻塞和待拍板识别误差大
应对：优先采用模板消息和关键词白名单

### 风险 4：第一版容易做成“消息汇总”而不是“决策看板”
应对：坚持“待拍板 / 阻塞项优先”排序

---

## 十三、后续演进方向

### Phase 1
MVP 文本看板（当前阶段）

### Phase 2
引入更稳的 taskId / status 协议

### Phase 3
支持事件订阅与关键状态主动提醒

### Phase 4
抽象成正式 OpenClaw 插件并准备开源

---

## 十四、结论

第一版技术实现应坚持：

**轻实现、强兼容、先可看、后精细。**

先把 owner 最需要的视图做出来，让人真正看见多 Agent 协作过程，再逐步提升结构化程度。
