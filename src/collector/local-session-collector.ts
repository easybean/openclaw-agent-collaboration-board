import fs from 'node:fs'
import path from 'node:path'
import type { RawTaskRecord, StateCollector } from './index.ts'

const AGENT_IDS = ['hongqigong', 'yangguo', 'huangrong', 'yideng', 'chengying', 'main']
const HARD_STATE_KEYWORDS = ['completed', 'blocked', 'waiting_input', 'waiting_approval', 'running', 'received']
const SOFT_RUNNING = ['继续做', '继续推进', '我继续', '开始做', '启动', '推进', '在做', 'running']
const SOFT_COMPLETED = ['已完成', '已修完', '已交付', '已推上', '已创建', '定稿', '发布', 'completed']
const SOFT_WAITING = ['等你', '待你', '待确认', '待拍板', '等待', 'waiting_approval', 'waiting_input']
const SOFT_BLOCKED = ['卡住', '阻塞', 'blocked', '超时', '失败']

function safeReadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function safeReadLines(filePath: string): string[] {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function extractTextFromJsonlLine(line: string): string {
  try {
    const obj = JSON.parse(line)
    const content = obj?.content
    if (Array.isArray(content)) {
      return content
        .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
        .map((part: any) => part.text)
        .join('\n')
    }
    if (typeof obj?.text === 'string') return obj.text
    return ''
  } catch {
    return ''
  }
}

function getLatestSessionFile(agentId: string): string | null {
  const sessionsIndex = safeReadJson(path.join(process.env.HOME || '', '.openclaw', 'agents', agentId, 'sessions', 'sessions.json'))
  if (!sessionsIndex || typeof sessionsIndex !== 'object') return null

  const entries = Object.entries(sessionsIndex)
    .filter(([key, value]: any) => key.includes(':telegram:direct:') && value?.sessionFile)
    .sort((a: any, b: any) => (b[1]?.updatedAt ?? 0) - (a[1]?.updatedAt ?? 0))

  const latest = entries[0]?.[1] as any
  return latest?.sessionFile ?? null
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some(needle => text.includes(needle))
}

function inferStatus(text: string): { status: string; ackStatus: string | null; needsDavidAction: boolean } {
  const lower = text.toLowerCase()
  const mixed = `${text}\n${lower}`

  if (includesAny(mixed, HARD_STATE_KEYWORDS)) {
    if (lower.includes('waiting_approval')) return { status: 'waiting_approval', ackStatus: 'waiting_approval', needsDavidAction: true }
    if (lower.includes('waiting_input')) return { status: 'waiting_input', ackStatus: 'waiting_input', needsDavidAction: false }
    if (lower.includes('blocked')) return { status: 'blocked', ackStatus: 'blocked', needsDavidAction: false }
    if (lower.includes('completed')) return { status: 'completed', ackStatus: 'completed', needsDavidAction: false }
    if (lower.includes('running')) return { status: 'running', ackStatus: 'running', needsDavidAction: false }
    if (lower.includes('received')) return { status: 'stale', ackStatus: 'received', needsDavidAction: false }
  }

  if (includesAny(mixed, SOFT_WAITING)) {
    const needsDavidAction = text.includes('拍板') || text.includes('David') || text.includes('董事长')
    return {
      status: needsDavidAction ? 'waiting_approval' : 'waiting_input',
      ackStatus: needsDavidAction ? 'waiting_approval' : 'waiting_input',
      needsDavidAction,
    }
  }

  if (includesAny(mixed, SOFT_BLOCKED)) {
    return { status: 'blocked', ackStatus: 'blocked', needsDavidAction: false }
  }

  if (includesAny(mixed, SOFT_COMPLETED)) {
    return { status: 'completed', ackStatus: 'completed', needsDavidAction: false }
  }

  if (includesAny(mixed, SOFT_RUNNING)) {
    return { status: 'running', ackStatus: 'running', needsDavidAction: false }
  }

  return { status: 'stale', ackStatus: null, needsDavidAction: false }
}

function buildA2AVisibilityTask(agentId: string, texts: string[], updatedAt: string): RawTaskRecord | null {
  const a2aTexts = texts.filter(text => text.includes('received') || text.includes('running') || text.includes('completed') || text.includes('blocked') || text.includes('Agent-to-agent'))
  if (a2aTexts.length === 0) return null

  const joined = a2aTexts.join('\n')
  const inferred = inferStatus(joined)

  return {
    taskId: `a2a-${agentId}`,
    title: `${agentId} A2A visibility`,
    type: 'runtime',
    owner: agentId,
    executor: agentId,
    status: inferred.status,
    ackStatus: inferred.ackStatus,
    updatedAt,
    summary: a2aTexts[a2aTexts.length - 1],
  }
}

export class LocalSessionCollector implements StateCollector {
  async collect(): Promise<RawTaskRecord[]> {
    const results: RawTaskRecord[] = []

    for (const agentId of AGENT_IDS) {
      const sessionFile = getLatestSessionFile(agentId)
      if (!sessionFile) continue

      const lines = safeReadLines(sessionFile)
      const recent = lines.slice(-20)
      const texts = recent.map(extractTextFromJsonlLine).filter(Boolean)
      const joined = texts.join('\n')
      if (!joined) continue
      const updatedAt = new Date(fs.statSync(sessionFile).mtimeMs).toISOString()
      const inferred = inferStatus(joined)

      results.push({
        taskId: `session-${agentId}`,
        title: `${agentId} recent collaboration`,
        type: 'runtime',
        owner: agentId,
        executor: agentId,
        status: inferred.status,
        ackStatus: inferred.ackStatus,
        updatedAt,
        summary: texts[texts.length - 1] ?? null,
      })

      const a2aTask = buildA2AVisibilityTask(agentId, texts, updatedAt)
      if (a2aTask) results.push(a2aTask)
    }

    return results
  }
}
