import fs from 'node:fs'
import path from 'node:path'
import type { RawTaskRecord, StateCollector } from './index.ts'

const AGENT_IDS = ['hongqigong', 'yangguo', 'huangrong', 'yideng', 'chengying', 'main']
const STATE_KEYWORDS = ['completed', 'blocked', 'waiting_input', 'waiting_approval', 'running', 'received']

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

function detectStatus(text: string): string {
  const lower = text.toLowerCase()
  for (const key of STATE_KEYWORDS) {
    if (lower.includes(key)) return key === 'received' ? 'stale' : key
  }
  return 'stale'
}

function detectAckStatus(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('waiting_approval')) return 'waiting_approval'
  if (lower.includes('waiting_input')) return 'waiting_input'
  if (lower.includes('blocked')) return 'blocked'
  if (lower.includes('completed')) return 'completed'
  if (lower.includes('running')) return 'running'
  if (lower.includes('received')) return 'received'
  return null
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
    return typeof obj?.text === 'string' ? obj.text : ''
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

export class LocalSessionCollector implements StateCollector {
  async collect(): Promise<RawTaskRecord[]> {
    const results: RawTaskRecord[] = []

    for (const agentId of AGENT_IDS) {
      const sessionFile = getLatestSessionFile(agentId)
      if (!sessionFile) continue

      const lines = safeReadLines(sessionFile)
      const recent = lines.slice(-6)
      const texts = recent.map(extractTextFromJsonlLine).filter(Boolean)
      const joined = texts.join('\n')
      if (!joined) continue

      results.push({
        taskId: `session-${agentId}`,
        title: `${agentId} recent collaboration`,
        type: 'runtime',
        owner: agentId,
        executor: agentId,
        status: detectStatus(joined),
        ackStatus: detectAckStatus(joined),
        updatedAt: new Date(fs.statSync(sessionFile).mtimeMs).toISOString(),
        summary: texts[texts.length - 1] ?? null,
      })
    }

    return results
  }
}
