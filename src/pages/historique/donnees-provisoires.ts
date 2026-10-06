/**
 * ⚠️ PROVISOIRE — à remplacer par les hooks de Codex (docs/COORDINATION.md, demande #15).
 * Filtrage de démonstration simple sur ces quelques lignes (onglet, recherche, utilisateur, statut, pagination) :
 * la vraie logique (magasin, période, total réel) reste côté Codex.
 *   useHistorique(filtres)            → AsyncState<Paginated<OperationDHistorique>>
 *   useCompteursDHistorique(filtres)  → AsyncState<CompteursDHistorique>   (mêmes filtres, sans l'onglet)
 *   useUtilisateursDeLHistorique()    → AsyncState<{ id: string; nom: string }[]>
 *   useExporterHistorique()           → (format, filtres) => Promise<void>
 */
import type { AsyncState, CompteursDHistorique, FiltresDHistorique, OperationDHistorique, Paginated } from "@/types"

const pret = <T,>(data: T): AsyncState<T> => ({ data, isLoading: false, error: null })
const il = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const operations: OperationDHistorique[] = [
  { id: "h1", date: il(12), categorie: "vente", type: "Vente", numero: "#4587", source: "Caisse · Paris République", reference: "Client comptant", referenceDetail: "Ciment 50 kg, Fer 8 mm", quantite: -12, montant: 455_000, detailValeur: "Payé en espèces", statut: "Validé", utilisateurNom: "Hugo Bernard", magasinNom: "Paris · République" },
  { id: "h2", date: il(48), categorie: "entree", type: "Entrée de stock", numero: "#M-012", source: "Saisie manuelle", reference: "Fournisseur Holcim", referenceDetail: "Ciment 50 kg", quantite: 200, montant: 6_400_000, detailValeur: "Stock : 85 → 285", statut: "Validé", utilisateurNom: "Inès Petit", magasinNom: "Paris · République" },
  { id: "h3", date: il(95), categorie: "transfert", type: "Transfert", numero: "#TR-025", source: "Saisie manuelle", reference: "Peinture 20 L", referenceDetail: "10 seaux", quantite: 10, montant: null, detailValeur: "Paris · République → Lyon · Part-Dieu", statut: "Validé", utilisateurNom: "Chloé Martin", magasinNom: "Paris · République" },
  { id: "h4", date: il(180), categorie: "inventaire", type: "Correction de stock", numero: "#CR-014", source: "Inventaire du rayon B", reference: "Fer 8 mm", referenceDetail: "Écart d’inventaire", quantite: 4, montant: null, detailValeur: "Stock : 116 → 120", statut: "Validé", utilisateurNom: "Inès Petit", magasinNom: "Paris · République", motif: "Barres retrouvées en réserve" },
  { id: "h5", date: il(260), categorie: "prix", type: "Modification de prix", numero: "#P-031", source: "Fiche produit", reference: "Peinture 20 L", referenceDetail: "Prix de vente", quantite: null, ancienMontant: 115_000, montant: 120_000, detailValeur: "+4,3 %", statut: "Validé", utilisateurNom: "Marc Lefèvre", magasinNom: "Tous les magasins" },
  { id: "h6", date: il(320), categorie: "sortie", type: "Sortie de stock", numero: "#S-008", source: "Consommation interne", reference: "Atelier", referenceDetail: "Disque à tronçonner", quantite: -5, montant: null, detailValeur: "Stock : 40 → 35", statut: "En attente", utilisateurNom: "Hugo Bernard", magasinNom: "Paris · République", motif: "Entretien de l’atelier" },
  { id: "h7", date: il(410), categorie: "annulation", type: "Annulation", numero: "#4579", source: "Caisse · Paris République", reference: "Client comptant", referenceDetail: "Vente #4579 annulée", quantite: 3, montant: 105_000, detailValeur: "Articles remis en stock", statut: "Annulé", utilisateurNom: "Chloé Martin", magasinNom: "Paris · République", motif: "Erreur de saisie" },
  { id: "h8", date: il(600), categorie: "vente", type: "Retour client", numero: "#RC-006", source: "Caisse · Paris République", reference: "M. Rakotobe", referenceDetail: "Robinet mitigeur", quantite: 1, montant: 38_000, detailValeur: "Remboursé", statut: "Validé", utilisateurNom: "Léa Rakoto", magasinNom: "Paris · République" },
]

const UTILISATEURS = [
  { id: "u1", nom: "Chloé Martin" },
  { id: "u2", nom: "Hugo Bernard" },
  { id: "u3", nom: "Inès Petit" },
  { id: "u5", nom: "Léa Rakoto" },
  { id: "u6", nom: "Marc Lefèvre" },
]

/** Filtres de démonstration, sans l'onglet (utilisés aussi pour les compteurs). */
function filtrerSansCategorie(f: FiltresDHistorique) {
  const recherche = f.recherche.trim().toLowerCase()
  const utilisateur = UTILISATEURS.find((u) => u.id === f.utilisateurId)?.nom
  return operations.filter(
    (o) =>
      (!recherche || [o.type, o.numero, o.reference, o.referenceDetail, o.source].some((t) => t.toLowerCase().includes(recherche))) &&
      (!utilisateur || o.utilisateurNom === utilisateur) &&
      (!f.statut || o.statut === f.statut)
  )
}

export function useHistoriqueProvisoire(filtres: FiltresDHistorique): AsyncState<Paginated<OperationDHistorique>> {
  const lignes = filtrerSansCategorie(filtres).filter((o) => !filtres.categorie || o.categorie === filtres.categorie)
  const debut = (filtres.page - 1) * filtres.pageSize
  return pret({ items: lignes.slice(debut, debut + filtres.pageSize), total: lignes.length, page: filtres.page, pageSize: filtres.pageSize })
}

export function useCompteursDHistoriqueProvisoires(filtres: FiltresDHistorique): AsyncState<CompteursDHistorique> {
  const lignes = filtrerSansCategorie(filtres)
  const compte = (c: OperationDHistorique["categorie"]) => lignes.filter((o) => o.categorie === c).length
  return pret({ tout: lignes.length, vente: compte("vente"), entree: compte("entree"), sortie: compte("sortie"), transfert: compte("transfert"), inventaire: compte("inventaire"), prix: compte("prix"), annulation: compte("annulation"), depense: compte("depense"), versement: compte("versement"), "facture-fournisseur": compte("facture-fournisseur") })
}

export function useUtilisateursDeLHistoriqueProvisoires(): AsyncState<{ id: string; nom: string }[]> {
  return pret(UTILISATEURS)
}

export async function exporterHistoriqueProvisoire(): Promise<void> {
  await new Promise((r) => setTimeout(r, 250))
}
