import { Building2, Database, FileText, Languages, Package, ShieldCheck, ShoppingCart, Store, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RubriqueDeParametres } from "@/types"
import { t, tr } from "@/i18n"

export const RUBRIQUES_DE_PARAMETRES: { value: RubriqueDeParametres; titre: string; description: string; icone: LucideIcon }[] = [
  { value: "entreprise", titre: "Entreprise", description: "Informations générales", icone: Building2 },
  { value: "facturation", titre: "Facturation", description: "NIF, STAT, numérotation…", icone: FileText },
  { value: "magasins", titre: "Magasins", description: "Gestion des magasins", icone: Store },
  { value: "catalogue", titre: "Catalogue", description: "Catégories et unités", icone: Package },
  { value: "stock", titre: "Stock", description: "Règles et alertes", icone: Database },
  { value: "ventes", titre: "Ventes", description: "Paramètres de vente", icone: ShoppingCart },
  { value: "roles", titre: "Rôles & sécurité", description: "Permissions et accès", icone: ShieldCheck },
  { value: "langue", titre: "Langue", description: "Français ou malagasy", icone: Languages },
]

/** Colonne de gauche (Figma : calque `navigation_des_parametres`, éléments `rubrique`). */
export function NavigationDesParametres({
  active,
  lien,
}: {
  active: RubriqueDeParametres
  lien: (rubrique: RubriqueDeParametres) => string
}) {
  return (
    <nav aria-label={t("Rubriques des paramètres")} className="flex w-full shrink-0 flex-col gap-[3px] lg:w-[220px]">
      {RUBRIQUES_DE_PARAMETRES.map(({ value, titre, description, icone: Icone }) => {
        const estActive = value === active
        return (
          <a
            key={value}
            href={lien(value)}
            aria-current={estActive ? "page" : undefined}
            className={cn(
              "flex h-[68px] items-center gap-4 rounded-lg px-5 transition-colors",
              estActive ? "bg-primary text-primary-foreground shadow-card" : "bg-card text-foreground hover:bg-accent"
            )}
          >
            <Icone className={cn("size-[22px] shrink-0", estActive ? "text-primary-foreground" : "text-foreground")} />
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className="truncate text-sm font-semibold">{tr(titre)}</span>
              <span className={cn("truncate text-[11px]", estActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {tr(description)}
              </span>
            </span>
          </a>
        )
      })}
    </nav>
  )
}
