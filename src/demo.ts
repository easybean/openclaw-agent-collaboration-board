import { normalizeTasks } from './normalizer/index.ts'
import { evaluateTasks } from './evaluator/index.ts'
import { renderTelegramBoard } from './renderer/index.ts'
import { demoTasks } from './demo-data.ts'

const normalized = normalizeTasks(demoTasks)
const evaluated = evaluateTasks(normalized)
const output = renderTelegramBoard(evaluated)

console.log(output)
