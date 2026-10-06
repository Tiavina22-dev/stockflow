/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #10).
 * Aucune logique : recherche, filtres et pagination ne sont PAS appliqués.
 *   useProduitsDuCatalogue(filtres)      → AsyncState<Paginated<LigneDeProduit>>
 *   useProduit(produitId)                → AsyncState<ProduitSaisi>
 *   useCategoriesDuStock()               → AsyncState<string[]>   (déjà demandé en #6)
 *   useEnregistrerProduit()              → (p: ProduitSaisi) => Promise<void>
 *   useChangerStatutProduit()            → (id, statut) => Promise<void>
 */
import type { AsyncState, FiltresDesProduits, LigneDeProduit, Paginated, ProduitSaisi } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })

const produits: LigneDeProduit[] = [
  { id: "p1", nomDuProduit: "Café noir 250g", reference: "SF-0001", codeBarres: "3760000000001", categorie: "Épicerie", unite: "Pièce", prixDeVente: 6.9, statut: "Actif" },
  { id: "p2", nomDuProduit: "Thé vert 100g", reference: "SF-0002", codeBarres: "3760000000002", categorie: "Boissons", unite: "Pièce", prixDeVente: 4.5, statut: "Actif" },
  { id: "p3", nomDuProduit: "Sucre bio 500g", reference: "SF-0003", codeBarres: "3760000000003", categorie: "Épicerie sucrée", unite: "Pièce", prixDeVente: 2.4, statut: "Actif" },
  { id: "p4", nomDuProduit: "Chocolat noir 70%", reference: "SF-0004", codeBarres: "3760000000004", categorie: "Épicerie sucrée", unite: "Pièce", prixDeVente: 3.2, statut: "Actif" },
  { id: "p5", nomDuProduit: "Miel de fleurs", reference: "SF-0005", codeBarres: "3760000000005", categorie: "Épicerie sucrée", unite: "Pièce", prixDeVente: 8.9, statut: "Actif" },
  { id: "p6", nomDuProduit: "Riz basmati 1kg", reference: "SF-0006", codeBarres: "3760000000006", categorie: "Épicerie", unite: "Kg", prixDeVente: 3.5, statut: "Actif" },
  { id: "p7", nomDuProduit: "Huile d’olive 75cl", reference: "SF-0007", codeBarres: "3760000000007", categorie: "Épicerie", unite: "Pièce", prixDeVente: 12.9, statut: "Actif" },
  { id: "p9", nomDuProduit: "Farine T65", reference: "SF-0009", codeBarres: "3760000000009", categorie: "Épicerie", unite: "Kg", prixDeVente: 1.3, statut: "Actif" },
  { id: "p8", nomDuProduit: "Pâtes complètes", reference: "SF-0008", codeBarres: "", categorie: "Épicerie", unite: "Pièce", prixDeVente: 1.9, statut: "Inactif" },
]

export function useProduitsDuCatalogueProvisoires(filtres: FiltresDesProduits): AsyncState<Paginated<LigneDeProduit>> {
  return pret({ items: produits.slice(0, filtres.pageSize), total: 48, page: filtres.page, pageSize: filtres.pageSize })
}

/** Produit complet pour la fenêtre de modification (à partir d'un id). */
export function produitSaisiProvisoire(id: string): ProduitSaisi | undefined {
  const p = produits.find((x) => x.id === id)
  if (!p) return undefined
  return {
    produitId: p.id,
    nomDuProduit: p.nomDuProduit,
    reference: p.reference,
    codeBarres: p.codeBarres,
    categorie: p.categorie,
    unite: p.unite,
    prixFournisseur: Math.round(p.prixDeVente * 0.6 * 100) / 100,
    prixDeVente: p.prixDeVente,
    seuilDeStockFaible: 20,
    statut: p.statut,
    photo: null,
    photoUrl: p.photoUrl,
    description: "",
  }
}

export function enregistrerProduitProvisoire(_produit: ProduitSaisi): Promise<void> {
  return Promise.resolve()
}
