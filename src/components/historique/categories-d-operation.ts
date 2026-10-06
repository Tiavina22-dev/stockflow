import { ArrowLeftRight, Ban, PackageMinus, PackagePlus, RefreshCw, ShoppingCart, Tag, type LucideIcon } from "lucide-react"

import type { TonPastille } from "@/components/donnees/pastille-etat"
import { ariary } from "@/components/donnees/montants"
import { tr } from "@/i18n"
import type { CategorieDOperation, OperationDHistorique, StatutDOperation, TypeDOperation } from "@/types"

/** Onglets du calque `categories` (Figma : Tout, Ventes, Entrées…). */
export const CATEGORIES_D_OPERATION: { value: CategorieDOperation; label: string }[] = [
  { value: "vente", label: "Ventes" },
  { value: "entree", label: "Entrées" },
  { value: "sortie", label: "Sorties" },
  { value: "transfert", label: "Transferts" },
  { value: "inventaire", label: "Inventaires" },
  { value: "prix", label: "Prix" },
  { value: "annulation", label: "Annulations" },
  { value: "depense", label: "Dépenses" },
  { value: "versement", label: "Versements" },
  { value: "facture-fournisseur", label: "Factures fournisseurs" },
]

/** Icône ronde de la colonne Type (calque `icone_type`) : icône + fond et couleur du thème. */
export const ICONE_PAR_CATEGORIE: Record<CategorieDOperation, { icone: LucideIcon; fond: string; texte: string }> = {
  depense: { icone: PackageMinus, fond: "bg-danger-muted", texte: "text-destructive" },
  versement: { icone: ShoppingCart, fond: "bg-success-muted", texte: "text-success" },
  "facture-fournisseur": { icone: Tag, fond: "bg-accent", texte: "text-primary" },
  vente: { icone: ShoppingCart, fond: "bg-success-muted", texte: "text-success" },
  entree: { icone: PackagePlus, fond: "bg-success-muted", texte: "text-success" },
  sortie: { icone: PackageMinus, fond: "bg-danger-muted", texte: "text-destructive" },
  transfert: { icone: ArrowLeftRight, fond: "bg-violet-muted", texte: "text-violet" },
  inventaire: { icone: RefreshCw, fond: "bg-caution-muted", texte: "text-caution" },
  prix: { icone: Tag, fond: "bg-accent", texte: "text-primary" },
  annulation: { icone: Ban, fond: "bg-danger-muted", texte: "text-destructive" },
}

export const TYPES_D_OPERATION: TypeDOperation[] = [
  "Vente",
  "Entrée de stock",
  "Sortie de stock",
  "Retour client",
  "Transfert",
  "Correction de stock",
  "Inventaire",
  "Modification de prix",
  "Annulation",
  "Dépense",
  "Versement",
  "Facture fournisseur",
]

export const STATUTS_D_OPERATION: StatutDOperation[] = ["Validé", "En attente", "Brouillon", "Annulé"]

export const TON_PAR_STATUT_D_OPERATION: Record<StatutDOperation, TonPastille> = {
  Validé: "succes",
  "En attente": "alerte",
  Brouillon: "neutre",
  Annulé: "danger",
}

/** Écran d'origine d'une opération (menu « … › Ouvrir dans … »). */
export const ECRAN_PAR_CATEGORIE: Record<CategorieDOperation, { libelle: string; lien: string }> = {
  depense: { libelle: "Cahier de vente", lien: "/ventes/cahier" },
  versement: { libelle: "Cahier de vente", lien: "/ventes/cahier" },
  "facture-fournisseur": { libelle: "Historique", lien: "/historique" },
  vente: { libelle: "Ventes", lien: "/ventes" },
  annulation: { libelle: "Ventes", lien: "/ventes" },
  entree: { libelle: "Stock", lien: "/stock" },
  sortie: { libelle: "Stock", lien: "/stock" },
  transfert: { libelle: "Stock", lien: "/stock" },
  inventaire: { libelle: "Stock", lien: "/stock" },
  prix: { libelle: "Produits", lien: "/produits" },
}

/** Valeur principale : montant, « ancien → nouveau » pour un prix, sinon le détail. */
export function valeurPrincipale(o: OperationDHistorique) {
  if (o.montant === null) return o.detailValeur
  return o.ancienMontant !== undefined ? `${ariary.format(o.ancienMontant)} → ${ariary.format(o.montant)}` : ariary.format(o.montant)
}

export const libelleDOperation = (o: OperationDHistorique) => `${tr(o.type)} ${o.numero}`.toUpperCase()
