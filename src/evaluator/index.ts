import type { BoardTask } from '../normalizer/index.ts'

export type EvaluatedBoardTask = BoardTask & {
  isActuallyProgressing: boolean
  progressState: string
  needsDavidAction: boolean
  nextActor: string | null
  isStale: boolean
}

export function evaluateTask(task: BoardTask): EvaluatedBoardTask {
  const needsDavidAction = task.status === 'waiting_approval'
  const isStale = task.status === 'running' ? false : task.status === 'stale'
  const isActuallyProgressing = !isStale && task.status !== 'blocked' && task.status !== 'waiting_input' && task.status !== 'waiting_approval'

  return {
    ...task,
    isActuallyProgressing,
    progressState: isStale ? 'stale' : task.status,
    needsDavidAction,
    nextActor: needsDavidAction ? 'David' : task.owner,
    isStale,
  }
}

export function evaluateTasks(tasks: BoardTask[]): EvaluatedBoardTask[] {
  return tasks.map(evaluateTask)
}
