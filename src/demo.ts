import { normalizeTasks } from './normalizer/index.ts'
import { evaluateTasks } from './evaluator/index.ts'
import { renderTelegramBoard } from './renderer/index.ts'
import { demoTasks } from './demo-data.ts'

const normalized = normalizeTasks(demoTasks)
const evaluated = evaluateTasks(normalized)
const output = renderTelegramBoard(evaluated)

console.log(output)

import { collectAgentStatuses } from './agent-status.ts'

const agentStatuses = collectAgentStatuses(evaluated)
console.log('\nAgent 状态层')
for (const item of agentStatuses) {
  console.log(`- ${item.agentId} | state: ${item.currentState} | ack: ${item.lastAckStatus ?? 'none'} | alive: ${item.isLikelyAlive ? 'yes' : 'no'}`)
}
