import { BadgeInfo, Boxes, History, Store, type LucideIcon } from "lucide-react"

import { t, tr } from "@/i18n"
import { cn } from "@/lib/utils"
import type { OngletDuProduit } from "@/types"

export const ONGLETS_DU_PRODUIT: { value: OngletDuProduit; titre: string; icone: LucideIcon }[] = [
  { value: "informations", titre: "Informations", icone: BadgeInfo },
  { value: "prix", titre: "Prix par magasin", icone: Store },
  { value: "stock", titre: "Stock actuel", icone: Boxes },
  { value: "historique", titre: "Historique", icone: History },
]

/** Figma : colonne `navigation_du_produit`, éléments `onglet_du_produit` (node 238:25900). */
export function NavigationDuProduit({ active, lien }: { active: OngletDuProduit; lien: (onglet: OngletDuProduit) => string }) {
  return (
    <nav
      aria-label={t("Rubriques du produit")}
      className="flex w-full shrink-0 flex-col gap-1.5 rounded-lg border border-grid-line bg-surface p-2 lg:w-[200px]"
    >
      {ONGLETS_DU_PRODUIT.map(({ value, titre, icone: Icone }) => {
        const estActif = value === active
        return (
          <a
            key={value}
            href={lien(value)}
            aria-current={estActif ? "page" : undefined}
            className={cn(
              "flex h-12 items-center gap-3 rounded-lg px-4 text-sm transition-colors",
              estActif ? "bg-accent font-bold text-primary" : "text-foreground hover:bg-accent/60"
            )}
          >
            <Icone className="size-[18px] shrink-0" />
            <span className="truncate">{tr(titre)}</span>
          </a>
        )
      })}
    </nav>
  )
}
