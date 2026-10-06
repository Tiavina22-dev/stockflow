import { CATEGORIES_D_OPERATION } from "@/components/historique/categories-d-operation"
import { cn } from "@/lib/utils"
import type { CategorieDOperation, CompteursDHistorique } from "@/types"
import { t, tr } from "@/i18n"

const nombre = new Intl.NumberFormat("fr-FR", { notation: "compact" })

/** Figma : calque `categories` — onglets `onglet` / `onglet_actif` avec `compteur`. */
export function OngletsDeCategorie({
  valeur,
  onChange,
  compteurs,
}: {
  /** null = « Tout » */
  valeur: CategorieDOperation | null
  onChange: (categorie: CategorieDOperation | null) => void
  compteurs: CompteursDHistorique | undefined
}) {
  const onglets: { value: CategorieDOperation | null; label: string; compteur?: number }[] = [
    { value: null, label: "Tout", compteur: compteurs?.tout },
    ...CATEGORIES_D_OPERATION.map((c) => ({ ...c, compteur: compteurs?.[c.value] })),
  ]

  return (
    <div role="group" aria-label={t("Catégories d’opérations")} className="flex gap-1.5 overflow-x-auto pb-1">
      {onglets.map(({ value, label, compteur }) => {
        const actif = value === valeur
        return (
          <button
            key={label}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-sm border px-3.5 text-[13px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              actif ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-grid-line bg-card font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            {tr(label)}
            {compteur !== undefined && (
              <span
                className={cn(
                  "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-normal tabular-nums",
                  actif ? "bg-white/20 text-primary-foreground" : "bg-background text-foreground"
                )}
              >
                {nombre.format(compteur)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
