import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react"
import type { DraftScope, DraftSnapshot, LocalDraft } from "@/types/local-drafts"
import { getLocalDraft } from "@/services/local-drafts"
import { notify } from "@/lib/notify"
import { t, tr } from "@/i18n"

const idle: DraftSnapshot = { ready: false, restored: false, saving: false, dirty: false, error: null, fields: {} }
const noSubscribe = () => () => {}
const idleSnapshot = () => idle
const reported = new WeakMap<LocalDraft, { restored: boolean; error: string | null }>()
function useDraftFeedback(draft: LocalDraft | undefined, state: DraftSnapshot) {
  useEffect(() => {
    if (!draft) return
    const previous = reported.get(draft) ?? { restored: false, error: null }
    if (state.restored && !previous.restored && !JSON.parse(draft.key)[1].endsWith("-ui")) notify("success", t("Votre saisie précédente a été restaurée."))
    if (state.error && state.error !== previous.error) notify("warning", tr(state.error))
    reported.set(draft, { restored: state.restored || previous.restored, error: state.error })
  }, [draft, state.restored, state.error])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const latest = draft?.snapshot()
      if (latest?.dirty && (latest.saving || latest.error)) { event.preventDefault(); event.returnValue = "" }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [draft])
}
export function useLocalDraft(scope: DraftScope | undefined) {
  const draft = scope?.userId ? getLocalDraft(scope) : undefined
  const state = useSyncExternalStore(draft?.subscribe ?? noSubscribe, draft?.snapshot ?? idleSnapshot, idleSnapshot)
  useDraftFeedback(draft, state)
  return { draft, ...state }
}
/** État UI fourni via props ; valeurs intermédiaires ("", "1,") conservées sans conversion. */
export function useDraftState<T>(draft: LocalDraft | undefined, field: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [fallback, setFallback] = useState(initial)
  const lastValue = useRef(fallback)
  const lastScope = useRef(draft?.key)
  const state = useSyncExternalStore(draft?.subscribe ?? noSubscribe, draft?.snapshot ?? idleSnapshot, idleSnapshot)
  if (lastScope.current !== draft?.key) {
    lastScope.current = draft?.key
    lastValue.current = typeof initial === "function" ? (initial as () => T)() : initial
  }
  if (draft && Object.hasOwn(state.fields, field)) lastValue.current = state.fields[field] as T
  const value = draft ? lastValue.current : fallback
  useDraftFeedback(draft, state)
  useEffect(() => { draft?.registerField(field, value) }, [draft, field, value])
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(next => {
    if (draft) draft.setField(field, next, lastValue.current)
    else setFallback(next)
  }, [draft, field])
  return [value, setValue]
}
