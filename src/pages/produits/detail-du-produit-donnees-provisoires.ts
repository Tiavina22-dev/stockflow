/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #24).
 *   useDetailDuProduit(id)          → AsyncState<DetailDuProduit>
 *   usePrixParMagasin(produitId)    → AsyncState<PrixParMagasin[]>
 *   useEnregistrerPrixParMagasin()  → (produitId, prix: PrixParMagasin[]) => Promise<void>
 * Les fiches sont fabriquées pour n'importe quel identifiant afin que l'œil « Consulter »
 * de la liste des produits ouvre toujours un détail.
 */
import { useState } from "react"

import photoCiment from "@/pages/produits/ciment-50kg-demo.jpg"
import type { AsyncState, DetailDuProduit, PrixParMagasin } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

export function useDetailDuProduitProvisoire(id: string): AsyncState<DetailDuProduit> {
  return pret({
    id,
    nom: "Ciment 50 kg",
    reference: "CIM-50",
    typeDeProduit: "Matériau",
    categorie: "Matériaux de construction",
    uniteDeVente: "Sac",
    uniteAuPluriel: "sacs",
    poids: "50 kg",
    prixDAchatMoyen: 29000,
    stockActuel: 1145,
    stockMinimum: 200,
    fournisseurPrincipal: "ABC Matériaux",
    statut: "Actif",
    photoUrl: photoCiment,
  })
}

const memoire = new Map<string, PrixParMagasin[]>()
const PRIX_DE_DEPART: PrixParMagasin[] = [
  { magasinId: "demo-ambatomainty", magasinNom: "Ambatomainty", prixDeVente: 35000 },
  { magasinId: "demo-salamamy", magasinNom: "Salamamy", prixDeVente: 36000 },
  { magasinId: "demo-majunga", magasinNom: "Majunga", prixDeVente: 34500 },
]

/** Renvoie aussi une version qui change à chaque enregistrement (clé du brouillon de la page). */
export function usePrixParMagasinProvisoires(produitId: string) {
  const [version, setVersion] = useState(0)
  const prix = memoire.get(produitId) ?? PRIX_DE_DEPART
  const enregistrer = async (nouveaux: PrixParMagasin[]) => {
    await new Promise((r) => setTimeout(r, 300))
    memoire.set(produitId, nouveaux)
    setVersion((v) => v + 1)
  }
  return { ...pret(prix), version, enregistrer }
}
