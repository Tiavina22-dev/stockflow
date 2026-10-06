export type DraftScope = { userId: string; form: string; shopId?: string; entityId?: string }
export type DraftSnapshot = {
  ready: boolean
  restored: boolean
  saving: boolean
  dirty: boolean
  error: string | null
  fields: Record<string, unknown>
}
/** Fourni par une page : le composant ne lit ni session, ni API, ni magasin global. */
export interface LocalDraft {
  readonly key: string
  subscribe: (listener: () => void) => () => void
  snapshot: () => DraftSnapshot
  registerField(field: string, initial: unknown): void
  setField<T>(field: string, value: T | ((previous: T) => T), initial: T): void
  flush(): Promise<void>
  clear(expectedFields?: Record<string, unknown>): Promise<void>
  submissionKey(payload: unknown): Promise<string>
}
