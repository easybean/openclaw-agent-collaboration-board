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
