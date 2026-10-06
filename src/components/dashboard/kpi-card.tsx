import { Ellipsis, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sparkline } from "@/components/dashboard/sparkline"
import { cn } from "@/lib/utils"
import type { Tone } from "@/types"
import { t, tr } from "@/i18n"

type KpiCardProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  value: string
  /** Variation en pourcentage, ex. 8.4 pour +8,4 % */
  trend: number
  trendLabel: string
  /** Sans série, la carte passe en variante « Sans graphique » (valeur centrée). */
  series?: number[]
  /** Par défaut : success si la tendance est positive, warning sinon. */
  tone?: Tone
  /** « compact » = cartes 320 px du kit avancé. */
  size?: "default" | "compact"
  className?: string
}

const toneStyles: Record<Tone, string> = {
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
}

const percent = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "always",
})

export function KpiCard({
  icon: Icon,
  title,
  subtitle,
  value,
  trend,
  trendLabel,
  series,
  tone = trend >= 0 ? "success" : "warning",
  size = "default",
  className,
}: KpiCardProps) {
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const compact = size === "compact"

  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border bg-accent shadow-card",
        compact ? "min-h-[193px] gap-5 p-5" : "min-h-[244px] gap-6 p-6",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-card text-primary">
            <Icon className="size-[25px]" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-sm">{tr(title)}</h3>
            <p className="truncate text-xs text-muted-foreground">{tr(subtitle)}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("Options de l’indicateur")}
            className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-card text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Ellipsis className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>{t("Voir le détail")}</DropdownMenuItem>
            <DropdownMenuItem>{t("Exporter")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className={cn("flex flex-col gap-2", !series && "flex-1 items-center")}>
          <p className="text-[34px] whitespace-nowrap tabular-nums">{value}</p>
          <div className="flex items-center gap-2 text-[10px] whitespace-nowrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold",
                toneStyles[tone]
              )}
            >
              <TrendIcon className="size-3" />
              {percent.format(trend)} %
            </span>
            <span className="text-muted-foreground">{tr(trendLabel)}</span>
          </div>
        </div>
        {series && (
          <div
            className={cn(
              "shrink-0 rounded-lg bg-card",
              compact ? "h-[52px] w-[88px] px-1 py-2" : "h-[60px] w-[172px] px-1.5 py-2"
            )}
          >
            <Sparkline data={series} className="size-full text-primary" />
          </div>
        )}
      </div>
    </section>
  )
}
