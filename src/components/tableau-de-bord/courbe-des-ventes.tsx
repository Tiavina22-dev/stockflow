import { t, formatDate } from "@/i18n"
import { ariary, ariaryCompact } from "@/components/donnees/montants"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type { PointDeVentes } from "@/types"


const configuration = {
  montant: { label: "Ventes", color: "var(--primary)" },
} satisfies ChartConfig

/** « 30 sept. » pour un jour, « sept. 2026 » pour un mois (AAAA-MM). */
export function libelleDeDate(date: string, long = false) {
  const estUnMois = date.length === 7
  const d = new Date(estUnMois ? `${date}-01T12:00:00` : `${date}T12:00:00`)
  return estUnMois
    ? formatDate({ month: "short", year: long ? "numeric" : undefined }).format(d)
    : formatDate({ day: "numeric", month: "short", weekday: long ? "long" : undefined }).format(d)
}

/**
 * Figma : calque `courbe_des_ventes` — graphique d'aire (shadcn/ui Chart + Recharts) :
 * une série, ligne 2 px, aire teintée ~10 %, grille discrète, info-bulle au survol.
 */
export function CourbeDesVentes({ points, className }: { points: PointDeVentes[]; className?: string }) {
  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{t("Aucune vente sur la période.")}</p>
  }

  return (
    <ChartContainer config={configuration} className={cn("aspect-auto h-[220px] w-full", className)}>
      <AreaChart data={points} margin={{ top: 12, right: 12, left: 4, bottom: 0 }} accessibilityLayer>
        <defs>
          <linearGradient id="remplissage-ventes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-montant)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--color-montant)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid-line)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={24}
          tickFormatter={(date: string) => libelleDeDate(date)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickCount={5}
          tickFormatter={(v: number) => ariaryCompact.format(v)}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(valeur, _nom, element) => (
                // La valeur d'abord (forte), la date ensuite (secondaire)
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-3 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="flex flex-col">
                    <span className="font-bold text-foreground tabular-nums">{ariary.format(Number(valeur))}</span>
                    <span className="text-muted-foreground">{libelleDeDate(String(element.payload?.date ?? ""), true)}</span>
                  </span>
                </span>
              )}
            />
          }
        />
        <Area
          dataKey="montant"
          type="monotone"
          stroke="var(--color-montant)"
          strokeWidth={2}
          fill="url(#remplissage-ventes)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
