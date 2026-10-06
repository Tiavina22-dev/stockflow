import type { LocalDraft } from "@/types/local-drafts"
import { useApiData } from "./useApiData"
import { useRef } from "react"
import { getCashSummary, getCashJournals, saveCashJournal, validateCashJournal } from "@/services/cash-journals-api"
export function useResumeDeCaisse(id: string | undefined, date: string) { return useApiData(`cash-summary:${id}:${date}`, () => getCashSummary(id, date)) }
export function useJournauxDeCaisse(id: string | undefined, date: string) { return useApiData(`cash-journals:${id}:${date}`, () => getCashJournals(id, date)) }
export function useEnregistrerSaisieDuCahier(draft?: LocalDraft) {
 const request = useRef(crypto.randomUUID())
 return async (s: Parameters<typeof saveCashJournal>[0]) => {
  const result = await saveCashJournal(s, draft ? await draft.submissionKey(s) : request.current)
  request.current = crypto.randomUUID()
  return result
 }
}
export const useValiderJournalDeCaisse = () => validateCashJournal
