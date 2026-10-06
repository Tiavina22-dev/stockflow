import { tr } from "@/i18n"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type TonIndicateur = "info" | "succes" | "alerte" | "danger" | "violet" | "neutre"

const styles: Record<TonIndicateur, { fond: string; accent: string; tuile?: string }> = {
  info: { fond: "bg-accent", accent: "text-primary" },
  succes: { fond: "bg-success-muted", accent: "text-success" },
  alerte: { fond: "bg-caution-muted", accent: "text-caution" },
  danger: { fond: "bg-danger-muted", accent: "text-destructive" },
  violet: { fond: "bg-violet-muted", accent: "text-violet" },
  neutre: { fond: "bg-card", accent: "text-primary", tuile: "bg-accent" },
}

type IndicateurCleProps = {
  icone: LucideIcon
  /** `libelle`, ex. « Produits en stock » */
  libelle: string
  /** Valeur principale déjà formatée (ex. « 1 248 », « 128 450 Ar ») */
  valeur: string
  /** Ligne colorée sous la valeur (`produit_detail` / `stock_detail`) ; facultative */
  detail?: string
  /** Couleur du détail selon la tendance (sinon couleur du ton) */
  tendance?: "hausse" | "baisse" | "stable"
  ton: TonIndicateur
  enChargement?: boolean
  className?: string
}

/** Figma : calque `indicateur` (112 px, fond teinté, icône dans une tuile blanche). */
export function IndicateurCle({
  icone: Icone,
  libelle,
  valeur,
  detail,
  tendance,
  ton,
  enChargement = false,
  className,
}: IndicateurCleProps) {
  const { fond, accent, tuile = "bg-card" } = styles[ton]
  const couleurDetail = tendance === "hausse" ? "text-success" : tendance === "baisse" ? "text-destructive" : tendance === "stable" ? "text-muted-foreground" : accent
  return (
    <section
      aria-busy={enChargement}
      className={cn(
        "flex h-28 min-w-0 items-center gap-4 rounded-lg border border-border px-[18px] shadow-card",
        fond,
        className
      )}
    >
      <div className={cn("flex h-[78px] w-[68px] shrink-0 items-center justify-center rounded-lg", tuile, accent)}>
        <Icone className="size-8" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm">{tr(libelle)}</h3>
        {enChargement ? (
          <>
            <span className="h-7 w-24 animate-pulse rounded-sm bg-card/80" />
            {detail !== undefined && <span className="h-3.5 w-32 animate-pulse rounded-sm bg-card/80" />}
          </>
        ) : (
          <>
            <p className="truncate text-[26px] leading-[1.05] font-bold tabular-nums">{valeur}</p>
            {detail !== undefined && <p className={cn("truncate text-xs font-semibold", couleurDetail)}>{tr(detail)}</p>}
          </>
        )}
      </div>
    </section>
  )
}
