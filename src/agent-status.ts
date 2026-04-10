import fs from 'node:fs'
import path from 'node:path'

export type AgentStatus = {
  agentId: string
  lastSessionUpdateAt: string | null
  lastStructuredSignalAt: string | null
  lastAckStatus: string | null
  currentState: 'running' | 'waiting' | 'blocked' | 'completed' | 'stale' | 'unknown'
  currentTaskSummary: string | null
  isStale: boolean
  isLikelyAlive: boolean
}

const AGENT_IDS = ['hongqigong', 'yangguo', 'huangrong', 'yideng', 'chengying', 'main']

function safeReadJson(filePath: string): any | null {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch { return null }
}

function getLatestSessionMeta(agentId: string): any | null {
  const file = path.join(process.env.HOME || '', '.openclaw', 'agents', agentId, 'sessions', 'sessions.json')
  const data = safeReadJson(file)
  if (!data || typeof data !== 'object') return null
  const entries = Object.entries(data)
    .filter(([key, value]: any) => key.includes(':telegram:direct:') && value)
    .sort((a: any, b: any) => (b[1]?.updatedAt ?? 0) - (a[1]?.updatedAt ?? 0))
  return entries[0]?.[1] ?? null
}

function inferStateFromSummary(summary: string | null): { state: AgentStatus['currentState']; ack: string | null } {
  const text = (summary ?? '').toLowerCase()
  if (!text) return { state: 'unknown', ack: null }
  if (text.includes('waiting_approval')) return { state: 'waiting', ack: 'waiting_approval' }
  if (text.includes('waiting_input')) return { state: 'waiting', ack: 'waiting_input' }
  if (text.includes('blocked') || text.includes('阻塞') || text.includes('卡住')) return { state: 'blocked', ack: 'blocked' }
  if (text.includes('completed') || text.includes('已完成') || text.includes('定稿')) return { state: 'completed', ack: 'completed' }
  if (text.includes('running') || text.includes('推进') || text.includes('继续做')) return { state: 'running', ack: 'running' }
  return { state: 'stale', ack: null }
}

export function collectAgentStatuses(boardTasks: { owner: string; summary: string | null; lastActivityAt: string | null; ackStatus: string | null; status: string }[]): AgentStatus[] {
  return AGENT_IDS.map(agentId => {
    const latestMeta = getLatestSessionMeta(agentId)
    const lastSessionUpdateAt = latestMeta?.updatedAt ? new Date(latestMeta.updatedAt).toISOString() : null
    const ownedTasks = boardTasks.filter(task => task.owner === agentId)
    const latestTask = ownedTasks[0] ?? null
    const inferred = inferStateFromSummary(latestTask?.summary ?? null)
    const currentState = latestTask?.status === 'blocked'
      ? 'blocked'
      : latestTask?.status === 'waiting_approval' || latestTask?.status === 'waiting_input'
        ? 'waiting'
        : latestTask?.status === 'running'
          ? 'running'
          : latestTask?.status === 'completed'
            ? 'completed'
            : inferred.state

    return {
      agentId,
      lastSessionUpdateAt,
      lastStructuredSignalAt: latestTask?.lastActivityAt ?? null,
      lastAckStatus: latestTask?.ackStatus ?? inferred.ack,
      currentState,
      currentTaskSummary: latestTask?.summary ?? null,
      isStale: currentState === 'stale',
      isLikelyAlive: Boolean(lastSessionUpdateAt || latestTask?.lastActivityAt),
    }
  })
}
