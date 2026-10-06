import type { LucideIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { tr } from "@/i18n"

export type OptionDeFiltre<V extends string> = { value: V; label: string }

type FiltreSelecteurProps<V extends string> = {
  icone: LucideIcon
  /** `libelle` (petit texte gris au-dessus de la valeur) */
  libelle: string
  options: OptionDeFiltre<V>[]
  valeur: V | null
  onChange: (valeur: V) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/** Figma : calque `selecteur` (48 px, icône + libellé + valeur + chevron). */
export function FiltreSelecteur<V extends string>({
  icone: Icone,
  libelle,
  options,
  valeur,
  onChange,
  placeholder = "Tous",
  disabled,
  className,
}: FiltreSelecteurProps<V>) {
  return (
    <Select
      items={options.map((o) => ({ ...o, label: tr(o.label) }))}
      value={valeur}
      onValueChange={(v) => v !== null && onChange(v as V)}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={tr(libelle)}
        className={cn(
          "h-12 w-full gap-2.5 rounded-sm border-grid-line bg-card px-3 data-[size=default]:h-12 data-popup-open:border-primary [&>svg:last-child]:size-3.5",
          className
        )}
      >
        <Icone className="size-[19px] text-foreground" />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
          <span className="text-[11px] text-muted-foreground">{tr(libelle)}</span>
          <SelectValue
            placeholder={tr(placeholder)}
            className="w-full truncate text-[13px] font-medium text-foreground"
          />
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} sideOffset={6} className="p-1 shadow-card">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="h-10 px-3 text-[13px]">
            {tr(option.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
