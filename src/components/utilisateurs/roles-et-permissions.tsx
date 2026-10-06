import { tr } from "@/i18n"
import { ChartColumn, Package, ShoppingCart, Tag, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ActionDePermission, ModuleDePermission, Permissions, RoleUtilisateur } from "@/types"

export const ROLES: RoleUtilisateur[] = ["Administrateur", "Responsable", "Gestionnaire de stock", "Vendeur", "Comptabilité", "Responsable de saisie"]

/** Couleur de pastille par rôle (Figma : colonne RÔLE). */
const styleDuRole: Record<RoleUtilisateur, string> = {
  "Comptabilité": "bg-accent text-primary",
  "Responsable de saisie": "bg-accent text-primary",
  Administrateur: "bg-accent text-primary",
  Responsable: "bg-violet-muted text-violet",
  "Gestionnaire de stock": "bg-caution-muted text-caution",
  Vendeur: "bg-success-muted text-success",
  "Assistant vente": "bg-accent text-primary",
}

export function BadgeDeRole({ role, className }: { role: RoleUtilisateur; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap", styleDuRole[role], className)}>
      {tr(role)}
    </span>
  )
}

/** Catalogue affiché dans le bloc « Permissions » de la fenêtre utilisateur. */
export const MODULES_DE_PERMISSION: {
  module: ModuleDePermission
  libelle: string
  icone: LucideIcon
  actions: { action: ActionDePermission; libelle: string }[]
}[] = [
  {
    module: "ventes",
    libelle: "Ventes",
    icone: ShoppingCart,
    actions: [
      { action: "creer", libelle: "Créer" },
      { action: "consulter", libelle: "Consulter" },
      { action: "annuler", libelle: "Annuler" },
    ],
  },
  {
    module: "stock",
    libelle: "Stock",
    icone: Package,
    actions: [
      { action: "consulter", libelle: "Consulter" },
      { action: "corriger", libelle: "Corriger" },
      { action: "transferer", libelle: "Transférer" },
    ],
  },
  {
    module: "produits",
    libelle: "Produits",
    icone: Tag,
    actions: [
      { action: "consulter", libelle: "Consulter" },
      { action: "modifier", libelle: "Modifier" },
      { action: "creer", libelle: "Créer" },
    ],
  },
  {
    module: "rapports",
    libelle: "Rapports",
    icone: ChartColumn,
    actions: [
      { action: "consulter", libelle: "Consulter" },
      { action: "exporter", libelle: "Exporter" },

    ],
  },
]

/**
 * Permissions proposées quand on choisit un rôle (point de départ, modifiable case par case).
 * Les droits effectifs sont vérifiés côté logique.
 */
export const PERMISSIONS_PAR_ROLE: Record<RoleUtilisateur, Permissions> = {
  "Comptabilité": { ventes: ["consulter", "annuler"], stock: ["consulter", "corriger", "transferer"], produits: ["consulter", "modifier"], rapports: ["consulter", "exporter"] },
  "Responsable de saisie": { ventes: ["creer", "consulter"], stock: ["consulter"], produits: ["consulter", "creer", "modifier"], rapports: ["consulter"] },
  Administrateur: {
    ventes: ["creer", "consulter", "annuler"],
    stock: ["consulter", "corriger", "transferer"],
    produits: ["consulter", "modifier", "creer"],
    rapports: ["consulter", "exporter"],
  },
  Responsable: {
    ventes: ["creer", "consulter", "annuler"],
    stock: ["consulter", "corriger", "transferer"],
    produits: ["consulter", "modifier"],
    rapports: ["consulter", "exporter"],
  },
  "Gestionnaire de stock": { ventes: ["consulter"], stock: ["consulter", "corriger", "transferer"], produits: ["consulter", "modifier"], rapports: ["consulter"] },
  Vendeur: { ventes: ["creer", "consulter"], stock: ["consulter"], produits: ["consulter"], rapports: [] },
  "Assistant vente": { ventes: ["creer", "consulter"], stock: [], produits: ["consulter"], rapports: [] },
}
