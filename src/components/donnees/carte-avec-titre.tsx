import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

/** Carte blanche avec titre à icône et action à droite (Figma : `evolution_des_ventes`, `produits_les_plus_vendus`). */
export function CarteAvecTitre({
  icone: Icone,
  titre,
  action,
  className,
  children,
}: {
  icone: LucideIcon
  titre: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-card p-4 shadow-card", className)}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icone className="size-[18px] text-primary" />
          {tr(titre)}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Petit sélecteur de période (Figma : calque `periode`, 140 × 28). */
export function SelecteurDePeriode<V extends string>({
  options,
  valeur,
  onChange,
  "aria-label": ariaLabel,
}: {
  options: { value: V; label: string }[]
  valeur: V
  onChange: (valeur: V) => void
  "aria-label": string
}) {
  return (
    <Select items={options.map((o) => ({ ...o, label: tr(o.label) }))} value={valeur} onValueChange={(v) => v && onChange(v as V)}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-7 w-[140px] rounded-sm border-grid-line bg-card px-2 text-[11px] text-muted-foreground data-[size=default]:h-7 [&>svg:last-child]:size-3.5"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="end" sideOffset={4} className="p-1 shadow-card">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="h-8 px-2 text-xs">
            {tr(o.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
