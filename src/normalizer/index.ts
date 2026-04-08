import type { RawTaskRecord } from '../collector'

export type BoardTask = {
  taskId: string
  title: string
  type: string
  owner: string
  executor: string | null
  status: string
  rawStatus: string
  ackStatus: string | null
  blockReason: string | null
  priority: string | null
  lastActivityAt: string | null
  summary: string | null
}

export function normalizeTask(record: RawTaskRecord): BoardTask {
  return {
    taskId: record.taskId,
    title: record.title ?? record.taskId,
    type: record.type ?? 'other',
    owner: record.owner ?? 'unknown',
    executor: record.executor ?? null,
    status: record.status ?? 'stale',
    rawStatus: record.status ?? 'unknown',
    ackStatus: record.ackStatus ?? null,
    blockReason: record.blockReason ?? null,
    priority: record.priority ?? null,
    lastActivityAt: record.updatedAt ?? record.finishedAt ?? record.startedAt ?? record.createdAt ?? null,
    summary: record.summary ?? null,
  }
}

export function normalizeTasks(records: RawTaskRecord[]): BoardTask[] {
  return records.map(normalizeTask)
}
