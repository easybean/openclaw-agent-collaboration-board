import type { BoardTask } from '../normalizer/index.ts'

export type EvaluatedBoardTask = BoardTask & {
  isActuallyProgressing: boolean
  progressState: string
  needsDavidAction: boolean
  nextActor: string | null
  isStale: boolean
}

export function evaluateTask(task: BoardTask): EvaluatedBoardTask {
  const completed = task.status === 'completed'
  const blocked = task.status === 'blocked'
  const waitingInput = task.status === 'waiting_input'
  const waitingApproval = task.status === 'waiting_approval'
  const stale = task.status === 'stale'
  const running = task.status === 'running'

  const needsDavidAction = waitingApproval
  const isStale = stale
  const isActuallyProgressing = completed || running

  return {
    ...task,
    isActuallyProgressing,
    progressState: isStale ? 'stale' : task.status,
    needsDavidAction,
    nextActor: waitingApproval ? 'David' : blocked || waitingInput ? task.owner : task.owner,
    isStale,
  }
}

export function evaluateTasks(tasks: BoardTask[]): EvaluatedBoardTask[] {
  return tasks.map(evaluateTask)
}
