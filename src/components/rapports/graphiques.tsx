import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceLine, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

/**
 * Graphiques des rapports — shadcn/ui Chart + Recharts.
 * Règles (skill dataviz) : un seul axe Y, barres ≤ 24 px arrondies 4 px côté valeur,
 * lignes 2 px, grille pleine et discrète, légende dès 2 séries, info-bulle au survol.
 */

export type SerieDeGraphique = {
  cle: string
  libelle: string
  /** Couleur CSS (ex. `var(--chart-1)`, `var(--success)`) */
  couleur: string
  type: "barre" | "ligne"
}

type Ligne = Record<string, string | number>

type GraphiqueEnBarresProps = {
  donnees: Ligne[]
  cleX: string
  series: SerieDeGraphique[]
  formatValeur: (v: number) => string
  /** Format des graduations de l'axe Y (sinon formatValeur) */
  formatAxe?: (v: number) => string
  formatX?: (x: string) => string
  /** Affiche toutes les étiquettes de l'axe X (catégories) */
  toutesLesEtiquettes?: boolean
  /** Index de la barre à mettre en avant (les autres sont atténuées) */
  indexEnAvant?: number
  hauteur?: number
  className?: string
}

export function GraphiqueEnBarres({
  donnees,
  cleX,
  series,
  formatValeur,
  formatAxe,
  formatX,
  indexEnAvant,
  toutesLesEtiquettes = false,
  hauteur = 220,
  className,
}: GraphiqueEnBarresProps) {
  const config = Object.fromEntries(series.map((s) => [s.cle, { label: s.libelle, color: s.couleur }])) satisfies ChartConfig

  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", className)} style={{ height: hauteur }}>
      <ComposedChart data={donnees} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--grid-line)" />
        <XAxis
          dataKey={cleX}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={toutesLesEtiquettes ? 0 : 12}
          interval={toutesLesEtiquettes ? 0 : "preserveEnd"}
          tickFormatter={(x) => {
            const texte = formatX ? formatX(String(x)) : String(x)
            // Nom complet dans l'info-bulle ; l'axe incliné reçoit une version courte
            return toutesLesEtiquettes && texte.length > 11 ? `${texte.slice(0, 10)}…` : texte
          }}
          // Étiquettes inclinées pour que toutes les catégories restent lisibles dans une carte étroite
          angle={toutesLesEtiquettes ? -30 : 0}
          textAnchor={toutesLesEtiquettes ? "end" : "middle"}
          height={toutesLesEtiquettes ? 56 : 30}
        />
        <YAxis tickLine={false} axisLine={false} width={56} tickCount={5} tickFormatter={(v: number) => (formatAxe ?? formatValeur)(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(x) => (formatX ? formatX(String(x)) : String(x))}
              formatter={(valeur, nom) => (
                <span className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[String(nom)]?.label ?? String(nom)}</span>
                  <span className="font-bold text-foreground tabular-nums">{formatValeur(Number(valeur))}</span>
                </span>
              )}
            />
          }
        />
        {series.length > 1 && <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start pt-0 pb-3" />} />}
        {series.map((s) =>
          s.type === "barre" ? (
            <Bar key={s.cle} dataKey={s.cle} fill={`var(--color-${s.cle})`} radius={[4, 4, 0, 0]} maxBarSize={24}>
              {indexEnAvant !== undefined &&
                donnees.map((_, i) => (
                  <Cell key={i} fill={`var(--color-${s.cle})`} fillOpacity={i === indexEnAvant ? 1 : 0.3} />
                ))}
            </Bar>
          ) : (
            <Line key={s.cle} dataKey={s.cle} type="monotone" stroke={`var(--color-${s.cle})`} strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--card)" }} />
          )
        )}
      </ComposedChart>
    </ChartContainer>
  )
}

/** Barres positives / négatives autour de zéro (ex. écarts de prix). */
export function GraphiqueDEcarts({
  donnees,
  cleX,
  cleValeur,
  libellePositif,
  libelleNegatif,
  formatValeur,
  formatX,
  hauteur = 220,
}: {
  donnees: Ligne[]
  cleX: string
  cleValeur: string
  libellePositif: string
  libelleNegatif: string
  formatValeur: (v: number) => string
  formatX?: (x: string) => string
  hauteur?: number
}) {
  const config = {
    positif: { label: libellePositif, color: "var(--destructive)" },
    negatif: { label: libelleNegatif, color: "var(--success)" },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex gap-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-success" aria-hidden />
          {libelleNegatif}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-destructive" aria-hidden />
          {libellePositif}
        </li>
      </ul>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: hauteur }}>
        <ComposedChart data={donnees} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--grid-line)" />
          <XAxis dataKey={cleX} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={formatX ? (x) => formatX(String(x)) : undefined} />
          <YAxis tickLine={false} axisLine={false} width={56} tickCount={5} tickFormatter={(v: number) => formatValeur(v)} />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(x) => (formatX ? formatX(String(x)) : String(x))}
                formatter={(valeur) => {
                  const v = Number(valeur)
                  return (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">{v >= 0 ? libellePositif : libelleNegatif}</span>
                      <span className={cn("font-bold tabular-nums", v >= 0 ? "text-destructive" : "text-success")}>{formatValeur(v)}</span>
                    </span>
                  )
                }}
              />
            }
          />
          <Bar dataKey={cleValeur} maxBarSize={20} radius={4}>
            {donnees.map((d, i) => (
              <Cell key={i} fill={Number(d[cleValeur]) >= 0 ? "var(--color-positif)" : "var(--color-negatif)"} />
            ))}
          </Bar>
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

/** Donut + légende lisible (nom, part, valeur) — Figma : « Répartition par vendeur ». */
export function GraphiqueDonut({
  donnees,
  libelleTotal,
  formatValeur,
}: {
  donnees: { id: string; libelle: string; valeur: number; detail?: string }[]
  libelleTotal: string
  formatValeur: (v: number) => string
}) {
  // Ordre fixe des couleurs catégorielles ; au-delà de 5, regroupement « Autres »
  const tries = [...donnees].sort((a, b) => b.valeur - a.valeur)
  const affiches = tries.length > 5 ? [...tries.slice(0, 4), { id: "autres", libelle: "Autres", valeur: tries.slice(4).reduce((s, d) => s + d.valeur, 0) }] : tries
  const total = affiches.reduce((s, d) => s + d.valeur, 0)
  const config = Object.fromEntries(affiches.map((d, i) => [d.id, { label: d.libelle, color: `var(--chart-${i + 1})` }])) satisfies ChartConfig
  const pourcentage = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 })

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-[150px] shrink-0">
      <ChartContainer config={config} className="aspect-square size-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(valeur, nom) => (
                  <span className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{tr(config[String(nom)]?.label)}</span>
                    <span className="font-bold text-foreground tabular-nums">{formatValeur(Number(valeur))}</span>
                  </span>
                )}
              />
            }
          />
          <Pie data={affiches.map((d) => ({ ...d, fill: `var(--color-${d.id})` }))} dataKey="valeur" nameKey="id" innerRadius={48} outerRadius={70} paddingAngle={2} strokeWidth={0} />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
        <span className="text-xl font-bold tabular-nums">{formatValeur(total)}</span>
        <span className="text-[11px] text-muted-foreground">{libelleTotal}</span>
      </div>
      </div>
      <ul className="flex min-w-[220px] flex-1 flex-col gap-2">
        {affiches.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--chart-${i + 1})` }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{tr(d.libelle)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{pourcentage.format(total ? d.valeur / total : 0)}</span>
            <span className="w-16 text-right font-semibold tabular-nums">{formatValeur(d.valeur)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
