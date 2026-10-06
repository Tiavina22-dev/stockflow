/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #25).
 *   useClientsDeFacture(magasinId)   → AsyncState<ClientDeFacture[]>      (GET /customers?shopId)
 *   useProchainNumeroDeFacture(magasinId) → AsyncState<string | null>     (facultatif)
 *   useCreerFactureClient()          → (saisie: SaisieDeFactureClient) => Promise<FactureClientCreee>  (POST /customer-invoices)
 * Le détail de la vente vient déjà du vrai hook `useDetailDeVenteProvisoire`.
 */
import type { AsyncState, ClientDeFacture, FactureClientCreee, SaisieDeFactureClient } from "@/types"

const CLIENTS: ClientDeFacture[] = [
  { id: "demo-rakoto", nom: "RAKOTO Construction", nif: "300 123 4567", stat: "711 123 456 789", adresse: "Lot II A 45, Andraharo, Antananarivo 101", telephone: "034 12 345 67" },
  { id: "demo-rasoa", nom: "RASOA Quincaillerie", nif: "300 765 4321", stat: "711 987 654 321", adresse: "Rue Ravoninahitriniarivo, Ankorondrano", telephone: "032 98 765 43" },
]

export function useClientsDeFactureProvisoires(_magasinId: string | undefined): AsyncState<ClientDeFacture[]> {
  return { data: CLIENTS, isLoading: false, error: null }
}

let compteur = 45
export async function creerFactureClientProvisoire(_saisie: SaisieDeFactureClient): Promise<FactureClientCreee> {
  await new Promise((r) => setTimeout(r, 400))
  const numero = `FAC-${new Date().getFullYear()}-${String(compteur++).padStart(5, "0")}`
  return { id: numero, numero }
}
