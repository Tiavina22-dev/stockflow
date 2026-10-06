import { CalendarDays } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ChampDateProps = {
  /** AAAA-MM-JJ */
  valeur: string
  onChange: (valeur: string) => void
  "aria-label": string
  max?: string
  className?: string
}

/** Champ date avec icône calendrier (Figma : sélecteurs `vente_date`). */
export function ChampDate({ valeur, onChange, max, className, ...aria }: ChampDateProps) {
  return (
    <div className={cn("relative", className)}>
      <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-[19px] -translate-y-1/2" />
      <Input
        type="date"
        {...aria}
        value={valeur}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-12 rounded-sm border-grid-line pl-10 text-[13px] font-medium md:text-[13px]"
      />
    </div>
  )
}

/** Date du jour au format AAAA-MM-JJ (heure locale). */
export function dateDuJour() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
