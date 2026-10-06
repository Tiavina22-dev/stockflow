import { CalendarDays } from "lucide-react"

import { ChampDate } from "@/components/forms/champ-date"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate, t } from "@/i18n"
import { cn } from "@/lib/utils"

const court = formatDate({ day: "2-digit", month: "2-digit", year: "numeric" })
const lire = (iso: string) => court.format(new Date(`${iso}T12:00:00`))

/** Période « Du 25/09/2026 au 30/09/2026 » : un champ, deux dates dans une petite fenêtre. */
export function ChampPeriode({
  du,
  au,
  onChange,
  max,
  className,
}: {
  /** AAAA-MM-JJ */
  du: string
  au: string
  onChange: (periode: { du: string; au: string }) => void
  max?: string
  className?: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label={t("Période")}
            className={cn("h-12 w-full justify-start gap-3 rounded-sm border-grid-line bg-card px-4 text-sm font-normal", className)}
          />
        }
      >
        <CalendarDays className="size-5 shrink-0" />
        <span className="truncate">{t("Du {{v0}} au {{v1}}", { v0: lire(du), v1: lire(au) })}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[320px] flex-col gap-3 p-4">
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          {t("Du")}
          <ChampDate aria-label={t("Date de début")} valeur={du} max={au} onChange={(v) => onChange({ du: v, au })} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          {t("Au")}
          <ChampDate aria-label={t("Date de fin")} valeur={au} max={max} onChange={(v) => onChange({ du: v < du ? v : du, au: v })} />
        </label>
      </PopoverContent>
    </Popover>
  )
}
