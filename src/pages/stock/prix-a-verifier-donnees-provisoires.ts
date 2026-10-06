/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #26).
 *   usePrixAVerifier(factureId)     → AsyncState<VerificationDePrix>   (écarts entre prix de la facture et prix fournisseur du catalogue)
 *   useDeciderPrixAVerifier()       → (factureId, decisions) => Promise<void>
 * En attendant, chaque facture propose les trois lignes de la maquette ; une décision les retire.
 */
import { useState } from "react"

import type { AsyncState, DecisionDePrix, PrixAVerifier, VerificationDePrix } from "@/types"

const LIGNES: PrixAVerifier[] = [
  { id: "p1", produitNom: "Ciment 50 kg", reference: "CIM-050", fournisseurNom: "Holcim", ancienPrix: 42000, nouveauPrix: 44900, stockActuel: 1 },
  { id: "p2", produitNom: "Fer 8 mm", reference: "FER-008", fournisseurNom: "BLC FER-BLC", ancienPrix: 6000, nouveauPrix: 6300, stockActuel: 1 },
  { id: "p3", produitNom: "Peinture 20 L", reference: "PEI-020", fournisseurNom: "Socol", ancienPrix: 185000, nouveauPrix: 190000, stockActuel: 1 },
]
const traitees = new Set<string>()

export function usePrixAVerifierProvisoire(factureId: string | undefined, numero: string | undefined, magasinNom: string | undefined) {
  const [, setVersion] = useState(0)
  const verification: AsyncState<VerificationDePrix> = {
    data: factureId ? { magasinNom: magasinNom ?? "—", origine: `Facture fournisseur ${numero ?? ""}`.trim(), lignes: traitees.has(factureId) ? [] : LIGNES } : undefined,
    isLoading: false,
    error: null,
  }
  const decider = async (_decisions: { id: string; decision: DecisionDePrix }[]) => {
    await new Promise((r) => setTimeout(r, 400))
    if (factureId) traitees.add(factureId)
    setVersion((v) => v + 1)
  }
  return { ...verification, decider }
}
