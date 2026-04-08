export type RawTaskRecord = {
  taskId: string
  title?: string
  type?: string
  owner?: string
  executor?: string | null
  status?: string
  ackStatus?: string | null
  blockReason?: string | null
  priority?: string | null
  createdAt?: string
  updatedAt?: string
  startedAt?: string
  finishedAt?: string
  summary?: string | null
}

export interface StateCollector {
  collect(): Promise<RawTaskRecord[]>
}

export class PlaceholderCollector implements StateCollector {
  async collect(): Promise<RawTaskRecord[]> {
    return []
  }
}
