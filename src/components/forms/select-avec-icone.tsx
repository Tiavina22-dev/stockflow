import { tr } from "@/i18n"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { PrefixeDeChamp } from "@/components/forms/champ-avec-icone"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type OptionAvecIcone<V extends string> = { value: V; label: string; rendu?: ReactNode }

type SelectAvecIconeProps<V extends string> = {
  id?: string
  /** Absente : liste déroulante simple, sans icône */
  icone?: LucideIcon
  options: OptionAvecIcone<V>[]
  valeur: V | null
  onChange: (valeur: V) => void
  placeholder?: string
  /** Pas de case grise : l'icône est posée dans le champ (Figma : champ « Statut ») */
  iconeSimple?: boolean
  "aria-invalid"?: boolean
  "aria-label"?: string
  className?: string
}

/** Liste déroulante avec case d'icône (Figma : champs Catégorie, Unité, Statut). */
export function SelectAvecIcone<V extends string>({
  id,
  icone: Icone,
  options,
  valeur,
  onChange,
  placeholder = "Choisir…",
  iconeSimple = false,
  className,
  ...aria
}: SelectAvecIconeProps<V>) {
  const choisie = options.find((o) => o.value === valeur)
  return (
    <Select items={options.map((o) => ({ ...o, label: tr(o.label) }))} value={valeur} onValueChange={(v) => v !== null && onChange(v as V)}>
      <div className={cn("relative", className)}>
        {Icone && !iconeSimple && <PrefixeDeChamp icone={Icone} className="z-10" />}
        <SelectTrigger
          id={id}
          {...aria}
          className={cn(
            "h-11 w-full rounded-sm border-grid-line bg-card pr-3 text-[13px] data-[size=default]:h-11 data-popup-open:border-primary [&>svg:last-child]:size-3.5",
            !Icone ? "pl-3" : iconeSimple ? "gap-2.5 pl-3" : "pl-[54px]"
          )}
        >
          {Icone && iconeSimple && <Icone className="size-4 text-foreground" />}
          {choisie?.rendu ? (
            <span className="flex flex-1 items-center">{choisie.rendu}</span>
          ) : (
            <SelectValue placeholder={tr(placeholder)} className="text-left" />
          )}
        </SelectTrigger>
      </div>
      <SelectContent alignItemWithTrigger={false} sideOffset={6} className="p-1 shadow-card">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="h-9 px-3 text-[13px]">
            {option.rendu ?? option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
