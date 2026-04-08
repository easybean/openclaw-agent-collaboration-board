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

  return joined.slice(0, 90)
}

function inferStructuredStatus(text: string): { status: string; ackStatus: string | null; needsDavidAction: boolean } {
  const lower = text.toLowerCase()
  const cleaned = cleanSummary(text)
  const hasExplicitNeedDavid = text.includes('是否需要 David 动作：是') || text.includes('是否需要 David 动作: 是')
  const hasDecisionLanguage = cleaned.includes('待拍板') || cleaned.includes('需要 David') || cleaned.includes('需 David')
  const hasCompletedSignal = lower.includes('completed') || cleaned.includes('已完成') || cleaned.includes('已修完') || cleaned.includes('已交付') || cleaned.includes('已推上') || cleaned.includes('定稿') || cleaned.includes('发布')
  const hasBlockedSignal = lower.includes('blocked') || cleaned.includes('阻塞') || cleaned.includes('卡住') || cleaned.includes('超时') || cleaned.includes('失败')
  const hasWaitingInput = lower.includes('waiting_input') || cleaned.includes('待输入') || cleaned.includes('等输入')
  const hasRunningSignal = lower.includes('running') || cleaned.includes('继续推进') || cleaned.includes('继续做') || cleaned.includes('在做') || cleaned.includes('启动')
  const hasReceivedSignal = lower.includes('received')

  if (hasCompletedSignal) return { status: 'completed', ackStatus: 'completed', needsDavidAction: false }
  if (hasBlockedSignal) return { status: 'blocked', ackStatus: 'blocked', needsDavidAction: false }
  if (hasWaitingInput) return { status: 'waiting_input', ackStatus: 'waiting_input', needsDavidAction: false }
  if (hasExplicitNeedDavid || hasDecisionLanguage || lower.includes('waiting_approval')) return { status: 'waiting_approval', ackStatus: 'waiting_approval', needsDavidAction: true }
  if (hasRunningSignal) return { status: 'running', ackStatus: 'running', needsDavidAction: false }
  if (hasReceivedSignal) return { status: 'stale', ackStatus: 'received', needsDavidAction: false }
  return { status: 'stale', ackStatus: null, needsDavidAction: false }
}

function cleanTitle(agentId: string, text: string): string {
  const cleaned = cleanSummary(text)
  if (cleaned.includes('A2A Task/State')) return 'A2A Task/State 协议'
  if (cleaned.includes('ACK')) return 'ACK 机制'
  if (cleaned.includes('Collector')) return 'Collector 开发'
  if (cleaned.includes('Runtime 状态汇报') || cleaned.includes('Runtime 状态说明')) return 'Runtime 状态跟踪'
  if (cleaned.includes('项目状态板')) return '项目状态板'
  if (cleaned.includes('GitHub')) return 'GitHub 仓库初始化'
  if (cleaned.includes('任务确认')) return `${agentId} 任务确认`
  if (cleaned.includes('任务接单')) return `${agentId} 任务接单`
  if (cleaned.includes('待拍板') || cleaned.includes('需要 David')) return `${agentId} 待拍板事项`
  return `${agentId} 协作状态`
}

function dedupeByTaskId(records: RawTaskRecord[]): RawTaskRecord[] {
  const map = new Map<string, RawTaskRecord>()
  for (const record of records) map.set(record.taskId, record)
  return [...map.values()]
}

export class LocalSessionCollector implements StateCollector {
  async collect(): Promise<RawTaskRecord[]> {
    const results: RawTaskRecord[] = []

    for (const agentId of AGENT_IDS) {
      const sessionFile = getLatestSessionFile(agentId)
      if (!sessionFile) continue
      const lines = safeReadLines(sessionFile)
      const recent = lines.slice(-80)
      const texts = recent.map(extractTextFromJsonlLine).filter(Boolean)
      const structuredTexts = texts.filter(containsStructuredMarker)
      if (structuredTexts.length === 0) continue

      const latestStructured = structuredTexts[structuredTexts.length - 1]
      const inferred = inferStructuredStatus(latestStructured)
      const updatedAt = new Date(fs.statSync(sessionFile).mtimeMs).toISOString()
      const title = cleanTitle(agentId, latestStructured)
      const summary = cleanSummary(latestStructured)

      results.push({
        taskId: `structured-${agentId}-${title}`,
        title,
        type: 'runtime',
        owner: agentId,
        executor: agentId,
        status: inferred.status,
        ackStatus: inferred.ackStatus,
        updatedAt,
        summary,
      })

      results.push({
        taskId: `a2a-${agentId}`,
        title: `${agentId} A2A 可见性`,
        type: 'runtime',
        owner: agentId,
        executor: agentId,
        status: inferred.status,
        ackStatus: inferred.ackStatus,
        updatedAt,
        summary,
      })
    }

    return dedupeByTaskId(results)
  }
}
