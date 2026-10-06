import { cn } from "@/lib/utils"
import type { ElementDeRepartition, ProduitEnEvolution } from "@/types"
import { tr } from "@/i18n"

const pourcentageSigne = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" })

/** Liste à barres horizontales (Figma : « Répartition par magasin », « Magasins avec le plus d'écarts »…). */
export function ListeDeBarres({ elements, ton = "primaire" }: { elements: ElementDeRepartition[]; ton?: "primaire" | "danger" }) {
  const maximum = Math.max(...elements.map((e) => e.valeur), 1)
  return (
    <ul className="flex flex-col gap-3">
      {elements.map((e) => (
        <li key={e.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 text-[13px]">
          <span className="truncate">{tr(e.libelle)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-grid-line" role="meter" aria-label={tr(e.libelle)} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={e.valeur}>
            <span className={cn("block h-full rounded-full", ton === "danger" ? "bg-destructive" : "bg-primary")} style={{ width: `${(e.valeur / maximum) * 100}%` }} />
          </span>
          <span className={cn("text-right text-xs font-semibold tabular-nums", ton === "danger" && "text-destructive")}>{e.valeurAffichee}</span>
        </li>
      ))}
    </ul>
  )
}

/** Liste de produits avec évolution en % (Figma : « Produits en progression / en baisse »). */
export function ListeDEvolution({ produits }: { produits: ProduitEnEvolution[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {produits.map((p) => (
        <li key={p.produitId} className="flex items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold">{p.produitNom}</span>
            <span className="truncate text-[11px] text-muted-foreground">{p.produitCategorie}</span>
          </span>
          <span className={cn("shrink-0 text-xs font-semibold tabular-nums", p.evolution >= 0 ? "text-success" : "text-destructive")}>
            {pourcentageSigne.format(p.evolution / 100)}
          </span>
        </li>
      ))}
    </ul>
  )
}
