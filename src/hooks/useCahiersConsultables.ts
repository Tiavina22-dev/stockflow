import type { FiltresDesCahiers } from "@/types"
import { getCahiersConsultables, getDetailDuCahier, getUtilisateursDesCahiers } from "@/services/journal-consultation-api"
import { useApiData } from "./useApiData"

export function useCahiersConsultables(f: FiltresDesCahiers) {
  return useApiData(`journal-consultation:${JSON.stringify(f)}`, () => getCahiersConsultables(f))
}
export function useDetailDuCahier(id: string | null) {
  return useApiData(`journal-detail:${id}`, () => getDetailDuCahier(id))
}
export function useUtilisateursDesCahiers() {
  return useApiData("journal-users", getUtilisateursDesCahiers)
}
