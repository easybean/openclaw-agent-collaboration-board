import { LocalSessionCollector } from './collector/local-session-collector.ts'
import { normalizeTasks } from './normalizer/index.ts'
import { evaluateTasks } from './evaluator/index.ts'
import { renderTelegramBoard } from './renderer/index.ts'

const collector = new LocalSessionCollector()
const records = await collector.collect()
const normalized = normalizeTasks(records)
const evaluated = evaluateTasks(normalized)
const output = renderTelegramBoard(evaluated)

console.log(output)

import { collectAgentStatuses } from './agent-status.ts'

const agentStatuses = collectAgentStatuses(evaluated)
console.log('\nAgent 状态层')
for (const item of agentStatuses) {
  console.log(`- ${item.agentId} | state: ${item.currentState} | ack: ${item.lastAckStatus ?? 'none'} | alive: ${item.isLikelyAlive ? 'yes' : 'no'} | summary: ${(item.currentTaskSummary ?? '').slice(0, 40)}`)
}
