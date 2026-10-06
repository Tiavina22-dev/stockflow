import { Package } from "lucide-react"

import type { ProduitPlusVendu } from "@/types"
import { t } from "@/i18n"

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : calque `classement` — rang, photo, nom, catégorie, barre relative au 1er. */
export function ProduitsLesPlusVendus({ produits }: { produits: ProduitPlusVendu[] }) {
  if (produits.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{t("Aucune vente sur la période.")}</p>
  }
  const maximum = Math.max(...produits.map((p) => p.quantiteVendue), 1)

  return (
    <ol className="flex flex-col gap-1.5">
      {produits.map((p) => (
        <li key={p.produitId} className="flex h-10 items-center gap-2.5" title={`${nombre.format(p.quantiteVendue)} vendus`}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary">
            {p.produitPosition}
          </span>
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground">
              <Package className="size-4" />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold">{p.produitNom}</span>
            <span className="truncate text-[11px] text-muted-foreground">{p.produitCategorie}</span>
          </span>
          <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">{nombre.format(p.quantiteVendue)}</span>
          <span
            role="meter"
            aria-label={t("Ventes de {{v0}}", { v0: p.produitNom })}
            aria-valuemin={0}
            aria-valuemax={maximum}
            aria-valuenow={p.quantiteVendue}
            className="h-2 w-[120px] shrink-0 overflow-hidden rounded-full bg-grid-line"
          >
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(p.quantiteVendue / maximum) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  )
}
