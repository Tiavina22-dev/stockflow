import {
  ArrowLeftRight,
  ClipboardList,
  Download,
  Undo2,
  Upload,
  type LucideIcon,
} from "lucide-react"

import type { TypeOperationDeStock } from "@/types"

/** Présentation de chaque type d'opération (textes et couleurs des maquettes Figma). */
export type ConfigurationOperation = {
  /** Carte de `nouvelle_operation_de_stock_fenetre` */
  libelleCourt: string
  description: string
  /** En-tête de la fenêtre d'opération */
  titre: string
  sousTitre?: string
  icone: LucideIcon
  /** Pastille ronde de la carte de choix */
  couleurPastille: string
  /** Tuile carrée de l'en-tête de la fenêtre */
  couleurSymbole: string
  indicationNote: string
  motifs: string[]
}

export const TYPES_D_OPERATION: Record<TypeOperationDeStock, ConfigurationOperation> = {
  entree: {
    libelleCourt: "Entrée",
    description: "Ajouter des produits",
    titre: "Entrée de stock",
    icone: Download,
    couleurPastille: "bg-success-muted text-success",
    couleurSymbole: "bg-accent text-primary",
    indicationNote: "Ex : N° de bon de livraison, fournisseur…",
    motifs: ["Réception fournisseur", "Réassort", "Production interne", "Autre"],
  },
  sortie: {
    libelleCourt: "Sortie",
    description: "Retirer des produits",
    titre: "Sortie",
    sousTitre: "Enregistrez une sortie de stock.",
    icone: Upload,
    couleurPastille: "bg-danger-muted text-destructive",
    couleurSymbole: "bg-danger-muted text-destructive",
    indicationNote: "Ex : Motif de la sortie, destinataire…",
    motifs: ["Casse", "Produit périmé", "Usage interne", "Don", "Autre"],
  },
  retour: {
    libelleCourt: "Retour",
    description: "Retour de produits",
    titre: "Retour client",
    icone: Undo2,
    couleurPastille: "bg-caution-muted text-caution",
    couleurSymbole: "bg-accent text-primary",
    indicationNote: "Ex : Référence vente, raison du retour…",
    motifs: ["Produit défectueux", "Erreur de commande", "Rétractation", "Autre"],
  },
  transfert: {
    libelleCourt: "Transfert entre magasins",
    description: "Déplacer des produits vers un autre magasin.",
    titre: "Transfert entre magasins",
    sousTitre: "Déplacez des produits entre deux magasins.",
    icone: ArrowLeftRight,
    couleurPastille: "bg-accent text-primary",
    couleurSymbole: "bg-accent text-primary",
    indicationNote: "Ex : Motif du transfert, véhicule…",
    motifs: ["Rééquilibrage", "Demande magasin", "Ouverture magasin", "Autre"],
  },
  correction: {
    libelleCourt: "Correction / Inventaire",
    description: "Ajuster les quantités suite à un inventaire",
    titre: "Correction / Inventaire",
    icone: ClipboardList,
    couleurPastille: "bg-violet-muted text-violet",
    couleurSymbole: "bg-accent text-primary",
    indicationNote: "Ex : Référence inventaire, justification…",
    motifs: ["Inventaire", "Erreur de saisie", "Casse constatée", "Vol / perte", "Autre"],
  },
}

export const ORDRE_DES_TYPES: TypeOperationDeStock[] = ["entree", "sortie", "retour", "transfert", "correction"]
