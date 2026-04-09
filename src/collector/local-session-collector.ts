import fs from 'node:fs'
import path from 'node:path'
import type { RawTaskRecord, StateCollector } from './index.ts'

const AGENT_IDS = ['hongqigong', 'yangguo', 'huangrong', 'yideng', 'chengying', 'main']
const STRUCTURED_MARKERS = [
  '【任务确认】', '【任务接单】', '【Runtime 状态说明】', '【项目状态板】',
  'Task ID：', 'Task ID:', 'owner：', 'owner:', '当前状态：', '当前状态:',
  '下一步：', '下一步:', '是否需要 David 动作：', '是否需要 David 动作:',
  'received', 'running', 'completed', 'blocked', 'waiting_input', 'waiting_approval'
]
const NOISE_PREFIXES = ['Conversation info', 'Sender (untrusted metadata)', '```json', '{', '}', 'Replied message']
const TASK_PATTERNS = [
  { key: 'A2A Task/State', title: 'A2A Task/State 协议' },
  { key: 'ACK', title: 'ACK 机制' },
  { key: 'Collector', title: 'Collector 开发' },
  { key: 'GitHub', title: 'GitHub 仓库初始化' },
  { key: 'README', title: 'README 完善' },
  { key: 'Runtime', title: 'Runtime 状态跟踪' },
  { key: '看板', title: '看板插件推进' },
  { key: '状态板', title: '项目状态板' },
]

function safeReadJson(filePath: string): any | null {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch { return null }
}
function safeReadLines(filePath: string): string[] {
  try { return fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean) } catch { return [] }
}

function extractTextFromJsonlLine(line: string): string {
  try {
    const obj = JSON.parse(line)
    const message = obj?.message ?? obj
    const content = message?.content
    if (Array.isArray(content)) {
      return content.filter((p: any) => p?.type === 'text' && typeof p?.text === 'string').map((p: any) => p.text).join('\n')
    }
    if (typeof message?.text === 'string') return message.text
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

function containsStructuredMarker(text: string): boolean {
  return STRUCTURED_MARKERS.some(marker => text.includes(marker))
}

function cleanSummary(text: string): string {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !NOISE_PREFIXES.some(prefix => line.startsWith(prefix)))
    .filter(line => line !== '```')
    .filter(line => !line.startsWith('[[reply_to_current]]'))

  const joined = lines.join(' ')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return joined.slice(0, 100)
}

function inferStructuredStatus(text: string): { status: string; ackStatus: string | null; needsDavidAction: boolean } {
  const lower = text.toLowerCase()
  const cleaned = cleanSummary(text)
  const explicitNeedDavid = text.includes('是否需要 David 动作：是') || text.includes('是否需要 David 动作: 是')
  const completed = lower.includes('completed') || cleaned.includes('已完成') || cleaned.includes('已修完') || cleaned.includes('已交付') || cleaned.includes('已推上') || cleaned.includes('定稿') || cleaned.includes('发布')
  const blocked = lower.includes('blocked') || cleaned.includes('阻塞') || cleaned.includes('卡住') || cleaned.includes('超时') || cleaned.includes('失败')
  const waitingInput = lower.includes('waiting_input') || cleaned.includes('待输入') || cleaned.includes('等输入')
  const running = lower.includes('running') || cleaned.includes('继续推进') || cleaned.includes('继续做') || cleaned.includes('在做') || cleaned.includes('启动')
  const received = lower.includes('received')
  const waitingApproval = lower.includes('waiting_approval') || explicitNeedDavid || cleaned.includes('待拍板') || cleaned.includes('需要 David') || cleaned.includes('需 David')

  if (completed) return { status: 'completed', ackStatus: 'completed', needsDavidAction: false }
  if (blocked) return { status: 'blocked', ackStatus: 'blocked', needsDavidAction: false }
  if (waitingInput) return { status: 'waiting_input', ackStatus: 'waiting_input', needsDavidAction: false }
  if (waitingApproval) return { status: 'waiting_approval', ackStatus: 'waiting_approval', needsDavidAction: true }
  if (running) return { status: 'running', ackStatus: 'running', needsDavidAction: false }
  if (received) return { status: 'stale', ackStatus: 'received', needsDavidAction: false }
  return { status: 'stale', ackStatus: null, needsDavidAction: false }
}

function inferTaskTitle(agentId: string, text: string): string {
  const cleaned = cleanSummary(text)
  for (const pattern of TASK_PATTERNS) {
    if (cleaned.includes(pattern.key)) return pattern.title
  }
  if (cleaned.includes('任务确认')) return `${agentId} 任务确认`
  if (cleaned.includes('任务接单')) return `${agentId} 任务接单`
  return `${agentId} 协作状态`
}

function dedupe(records: RawTaskRecord[]): RawTaskRecord[] {
  const byId = new Map<string, RawTaskRecord>()
  for (const record of records) byId.set(record.taskId, record)
  return [...byId.values()]
}

export class LocalSessionCollector implements StateCollector {
  async collect(): Promise<RawTaskRecord[]> {
    const results: RawTaskRecord[] = []

    for (const agentId of AGENT_IDS) {
      const sessionFile = getLatestSessionFile(agentId)
      if (!sessionFile) continue
      const lines = safeReadLines(sessionFile)
      const recent = lines.slice(-120)
      const texts = recent.map(extractTextFromJsonlLine).filter(Boolean)
      const structuredTexts = texts.filter(containsStructuredMarker)
      if (structuredTexts.length === 0) continue

      const updatedAt = new Date(fs.statSync(sessionFile).mtimeMs).toISOString()

      for (const rawText of structuredTexts.slice(-8)) {
        const summary = cleanSummary(rawText)
        if (!summary) continue
        const inferred = inferStructuredStatus(rawText)
        const title = inferTaskTitle(agentId, rawText)

        results.push({
          taskId: `task-${agentId}-${title}`,
          title,
          type: 'runtime',
          owner: agentId,
          executor: agentId,
          status: inferred.status,
          ackStatus: inferred.ackStatus,
          updatedAt,
          summary,
        })
      }

      const latestStructured = structuredTexts[structuredTexts.length - 1]
      const latestStatus = inferStructuredStatus(latestStructured)
      results.push({
        taskId: `a2a-${agentId}`,
        title: `${agentId} A2A 可见性`,
        type: 'runtime',
        owner: agentId,
        executor: agentId,
        status: latestStatus.status,
        ackStatus: latestStatus.ackStatus,
        updatedAt,
        summary: cleanSummary(latestStructured),
      })
    }

    return dedupe(results)
  }
}
