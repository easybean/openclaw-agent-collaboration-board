import type { EvaluatedBoardTask } from '../evaluator/index.ts'

export function renderTelegramBoard(tasks: EvaluatedBoardTask[]): string {
  const a2aItems = tasks.filter(task => task.title.includes('A2A 可见性'))
  const current = tasks.filter(task => !task.title.includes('A2A 可见性') && ['running', 'stale', 'blocked', 'waiting_input', 'waiting_approval'].includes(task.progressState))
  const completed = tasks.filter(task => !task.title.includes('A2A 可见性') && task.progressState === 'completed')
  const decisionItems = tasks.filter(task => task.needsDavidAction)

  const lines: string[] = []
  lines.push('【项目状态板】')
  lines.push('项目：OpenClaw Agent Collaboration Board')
  lines.push('')
  lines.push('协作回执状态')
  if (a2aItems.length === 0) lines.push('- 当前无')
  else for (const task of a2aItems) lines.push(`- ${task.owner} | ack: ${task.ackStatus ?? 'none'} | status: ${task.progressState} | 摘要: ${task.summary ?? '无'}`)

  lines.push('')
  lines.push('当前任务')
  if (current.length === 0) lines.push('- 当前无')
  else for (const task of current) lines.push(`- ${task.title} | owner: ${task.owner} | status: ${task.progressState} | next: ${task.nextActor ?? 'unknown'} | 摘要: ${task.summary ?? '无'}`)

  lines.push('')
  lines.push('已完成')
  if (completed.length === 0) lines.push('- 当前无')
  else for (const task of completed) lines.push(`- ${task.title} | owner: ${task.owner} | status: completed | 摘要: ${task.summary ?? '无'}`)

  lines.push('')
  lines.push('待拍板')
  if (decisionItems.length === 0) lines.push('- 当前无')
  else for (const task of decisionItems) lines.push(`- ${task.title} | status: ${task.progressState} | needs: David | 摘要: ${task.summary ?? '无'}`)

  return lines.join('\n')
}
