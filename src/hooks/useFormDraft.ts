import { useCallback } from "react"
import type { LocalDraft } from "@/types/local-drafts"
import { getLocalDraft } from "@/services/local-drafts"
import { useCurrentUser } from "./useCurrentUser"
import { useLocalDraft } from "./useLocalDraft"
import { notify } from "@/lib/notify"
import { t, tr } from "@/i18n"

/** Pages uniquement : le compte est injecté aux composants par une prop. */
export function useFormDraft(form: string, shopId?: string, entityId?: string) {
  const { data: user } = useCurrentUser()
  return useLocalDraft(user ? { userId: user.id, form, shopId, entityId } : undefined).draft
}
export function useDraftFactory() {
  const { data: user } = useCurrentUser()
  return useCallback((form: string, entityId?: string, shopId?: string) => user ? getLocalDraft({ userId: user.id, form, entityId, shopId }) : undefined, [user?.id])
}
export async function saveDraftOnServer<T>(draft: LocalDraft | undefined, save: (requestKey?: string) => Promise<T>, payload?: unknown): Promise<T> {
  if (!draft) throw new Error(t("Attendez le chargement de votre compte avant d’enregistrer."))
  await draft.flush()
  const fields = draft.snapshot().fields
  const requestKey = payload === undefined ? undefined : await draft.submissionKey(payload)
  const result = await save(requestKey)
  try { await draft.clear(fields) }
  catch (error) { notify("warning", tr(error instanceof Error ? error.message : "La copie locale n’a pas pu être effacée.")) }
  return result
}
