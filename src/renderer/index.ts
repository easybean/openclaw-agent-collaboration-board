import type { EvaluatedBoardTask } from '../evaluator/index.ts'

function shorten(text: string | null | undefined, max = 36): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return '无'
  return t.length > max ? `${t.slice(0, max)}...` : t
}

function isGenericTitle(title: string): boolean {
  return title.includes('协作状态') || title.includes('A2A 可见性') || title.includes('任务确认') || title.includes('任务接单')
}

export function renderTelegramBoard(tasks: EvaluatedBoardTask[]): string {
  const a2aItems = tasks.filter(task => task.title.includes('A2A 可见性'))
  const current = tasks.filter(task => !task.title.includes('A2A 可见性') && !isGenericTitle(task.title) && ['running', 'stale', 'blocked', 'waiting_input', 'waiting_approval'].includes(task.progressState))
  const completed = tasks.filter(task => !task.title.includes('A2A 可见性') && !isGenericTitle(task.title) && task.progressState === 'completed')
  const decisionItems = tasks.filter(task => task.needsDavidAction && !task.title.includes('A2A 可见性'))
  const blockers = tasks.filter(task => !task.title.includes('A2A 可见性') && !isGenericTitle(task.title) && ['blocked', 'waiting_input', 'stale'].includes(task.progressState))

  const lines: string[] = []
  lines.push('【项目状态板】')
  lines.push('项目：OpenClaw Agent Collaboration Board')
  lines.push('')

  lines.push('待拍板')
  if (decisionItems.length === 0) lines.push('- 当前无')
  else for (const task of decisionItems.slice(0, 5)) lines.push(`- ${task.title} | status: ${task.progressState} | 摘要: ${shorten(task.summary)}`)

  lines.push('')
  lines.push('阻塞/停滞')
  if (blockers.length === 0) lines.push('- 当前无')
  else for (const task of blockers.slice(0, 5)) lines.push(`- ${task.title} | owner: ${task.owner} | status: ${task.progressState} | 摘要: ${shorten(task.summary)}`)

  lines.push('')
  lines.push('当前任务')
  if (current.length === 0) lines.push('- 当前无')
  else for (const task of current.slice(0, 5)) lines.push(`- ${task.title} | owner: ${task.owner} | status: ${task.progressState} | 摘要: ${shorten(task.summary)}`)

  lines.push('')
  lines.push('最近完成')
  if (completed.length === 0) lines.push('- 当前无')
  else for (const task of completed.slice(0, 5)) lines.push(`- ${task.title} | owner: ${task.owner} | 摘要: ${shorten(task.summary)}`)

  lines.push('')
  lines.push('协作回执状态（调试层）')
  if (a2aItems.length === 0) lines.push('- 当前无')
  else for (const task of a2aItems.slice(0, 6)) lines.push(`- ${task.owner} | ack: ${task.ackStatus ?? 'none'} | status: ${task.progressState} | 摘要: ${shorten(task.summary, 24)}`)

  return lines.join('\n')
}
