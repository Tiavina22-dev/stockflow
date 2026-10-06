import { t } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { Package } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ArticleVendu } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

type ArticlesVendusProps = {
  articles: ArticleVendu[]
  /** « normale » : fenêtre Détail de la vente ; « compacte » : ligne dépliée du cahier */
  variante?: "normale" | "compacte"
  className?: string
}

/** Tableau des articles d'une vente (Figma : `produits_vendus` / `detail_des_produits`). */
export function ArticlesVendus({ articles, variante = "normale", className }: ArticlesVendusProps) {
  const compacte = variante === "compacte"
  const grille = "grid grid-cols-[minmax(0,1fr)_116px_65px_135px_120px] items-center"

  return (
    <div className={cn("overflow-hidden", !compacte && "rounded-lg border border-grid-line", className)}>
      <div
        className={cn(
          grille,
          "border-b border-grid-line bg-background px-3.5 font-bold text-muted-foreground",
          compacte ? "h-[34px] text-[10px]" : "h-10 text-[11px] uppercase"
        )}
      >
        <span>{t("Produit")}</span>
        <span>{t("Référence")}</span>
        <span>{t("Qté")}</span>
        <span>{t("Prix unitaire")}</span>
        <span className="text-right">{t("Total")}</span>
      </div>
      {articles.map((article) => (
        <div
          key={article.produitId}
          className={cn(grille, "border-b border-grid-line px-3.5 last:border-b-0", compacte ? "h-11 bg-card" : "h-[72px]")}
        >
          <div className="flex min-w-0 items-center gap-3">
            {article.photoUrl ? (
              <img
                src={article.photoUrl}
                alt=""
                className={cn("shrink-0 rounded object-cover", compacte ? "h-8 w-6" : "h-12 w-[38px]")}
              />
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded bg-background text-muted-foreground",
                  compacte ? "h-8 w-6" : "h-12 w-[38px]"
                )}
              >
                <Package className={compacte ? "size-3.5" : "size-5"} />
              </span>
            )}
            <span className={cn("truncate font-semibold", compacte ? "text-xs" : "text-[13px]")}>{article.produitNom}</span>
          </div>
          <span>
            {compacte ? (
              <span className="text-xs text-primary">{article.produitReference}</span>
            ) : (
              <span className="rounded-sm bg-accent px-2 py-1 text-[11px] text-primary">{article.produitReference}</span>
            )}
          </span>
          <span className={cn("font-semibold tabular-nums", compacte ? "text-xs" : "text-[13px]")}>{nombre.format(article.produitQuantite)}</span>
          <span className={cn("text-primary tabular-nums", compacte ? "text-xs" : "text-[13px]")}>{ariary.format(article.produitPrixUnitaire)}</span>
          <span className={cn("text-right font-semibold tabular-nums", compacte ? "text-xs" : "text-[13px]")}>
            {ariary.format(article.produitQuantite * article.produitPrixUnitaire)}
          </span>
        </div>
      ))}
    </div>
  )
}
