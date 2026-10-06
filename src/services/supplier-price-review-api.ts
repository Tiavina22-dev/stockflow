import type { DecisionDePrix, PrixAVerifier, VerificationDePrix } from "@/types"
import { api, invalidateApi } from "./http-api"

/** Un prix absent est inconnu, pas égal à zéro ; adaptation UI documentée en COORDINATION. */
export type VerificationDePrixReels = Omit<VerificationDePrix, "lignes"> & { lignes: (Omit<PrixAVerifier, "ancienPrix"> & { ancienPrix: number | null })[] }
export const getPrixAVerifier = (id: string) => api<VerificationDePrixReels>(`/supplier-invoices/${encodeURIComponent(id)}/price-review`)
export async function deciderPrixAVerifier(id: string, decisions: { id: string; decision: DecisionDePrix }[]): Promise<void> {
  try {
    await api(`/supplier-invoices/${encodeURIComponent(id)}/price-review`, "POST", { decisions })
  } finally {
    // Même en cas de conflit : recharger les nouveaux jetons sans écraser une décision concurrente.
    invalidateApi()
  }
}
