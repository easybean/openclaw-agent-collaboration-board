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

function inferStructuredStatus(text: string): { status: string; ackStatus: string | null; needsDavidAction: boolean } {
  const lower = text.toLowerCase()
  const needsDavidAction = text.includes('是否需要 David 动作：是') || text.includes('是否需要 David 动作: 是') || text.includes('待拍板') || text.includes('David')
  if (lower.includes('waiting_approval')) return { status: 'waiting_approval', ackStatus: 'waiting_approval', needsDavidAction: true }
  if (lower.includes('waiting_input')) return { status: 'waiting_input', ackStatus: 'waiting_input', needsDavidAction: false }
  if (lower.includes('blocked')) return { status: 'blocked', ackStatus: 'blocked', needsDavidAction: false }
  if (lower.includes('completed')) return { status: 'completed', ackStatus: 'completed', needsDavidAction: false }
  if (lower.includes('running')) return { status: 'running', ackStatus: 'running', needsDavidAction }
  if (lower.includes('received')) return { status: 'stale', ackStatus: 'received', needsDavidAction }
  if (text.includes('当前状态：正常') || text.includes('当前状态: 正常')) return { status: 'running', ackStatus: 'running', needsDavidAction }
  if (text.includes('当前状态：已阻塞') || text.includes('当前状态: 已阻塞')) return { status: 'blocked', ackStatus: 'blocked', needsDavidAction }
  if (text.includes('当前状态：有风险') || text.includes('当前状态: 有风险')) return { status: 'stale', ackStatus: null, needsDavidAction }
  return { status: 'stale', ackStatus: null, needsDavidAction }
}

function cleanTitle(agentId: string, text: string): string {
  if (text.includes('A2A Task/State')) return 'A2A Task/State 协议'
  if (text.includes('ACK')) return 'ACK 机制'
  if (text.includes('Collector')) return 'Collector 开发'
  if (text.includes('Runtime 状态汇报') || text.includes('Runtime 状态说明')) return 'Runtime 状态跟踪'
  if (text.includes('项目状态板')) return '项目状态板'
  if (text.includes('GitHub')) return 'GitHub 仓库初始化'
  if (text.includes('待拍板') || text.includes('David 动作')) return `${agentId} 待拍板事项`
  if (text.includes('任务确认')) return `${agentId} 任务确认`
  if (text.includes('任务接单')) return `${agentId} 任务接单`
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
      const recent = lines.slice(-40)
      const texts = recent.map(extractTextFromJsonlLine).filter(Boolean)
      const structuredTexts = texts.filter(containsStructuredMarker)
      if (structuredTexts.length === 0) continue

      const latestStructured = structuredTexts[structuredTexts.length - 1]
      const inferred = inferStructuredStatus(latestStructured)
      const updatedAt = new Date(fs.statSync(sessionFile).mtimeMs).toISOString()
      const title = cleanTitle(agentId, latestStructured)

      results.push({
        taskId: `structured-${agentId}-${title}`,
        title,
        type: 'runtime',
        owner: agentId,
        executor: agentId,
        status: inferred.status,
        ackStatus: inferred.ackStatus,
        updatedAt,
        summary: latestStructured.slice(0, 300),
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
        summary: latestStructured.slice(0, 300),
      })
    }

    return dedupeByTaskId(results)
  }
}
