import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ChampNombre } from "@/components/forms/champ-nombre"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

type SelecteurDeQuantiteProps = {
  valeur: number
  onChange: (valeur: number) => void
  min?: number
  max?: number
  /** Nom de l'élément, pour les libellés accessibles */
  nom: string
  className?: string
}

/** Figma : calque `quantite` (bouton « − », valeur, bouton « + » accolés). */
export function SelecteurDeQuantite({ valeur, onChange, min = 1, max, nom, className }: SelecteurDeQuantiteProps) {
  const borner = (v: number) => Math.max(min, max === undefined ? v : Math.min(max, v))

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="outline"
        aria-label={t("Diminuer la quantité de {{v0}}", { v0: nom })}
        disabled={valeur <= min}
        onClick={() => onChange(borner(valeur - 1))}
        className="size-[34px] rounded-r-none border-grid-line bg-background p-0 text-muted-foreground disabled:bg-background"
      >
        <Minus className="size-3.5" />
      </Button>
      <ChampNombre
        aria-label={t("Quantité de {{v0}}", { v0: nom })}
        valeur={String(valeur)}
        onChange={(v) => v !== "" && onChange(borner(Math.round(Number(v))))}
        className="h-[34px] w-12 rounded-none border-x-0 border-grid-line px-1 text-center text-xs font-semibold md:text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        variant="secondary"
        aria-label={t("Augmenter la quantité de {{v0}}", { v0: nom })}
        disabled={max !== undefined && valeur >= max}
        onClick={() => onChange(borner(valeur + 1))}
        className="size-[34px] rounded-l-none border border-grid-line p-0"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}
