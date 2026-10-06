import { PackageOpen, X } from "lucide-react"

import { ORDRE_DES_TYPES, TYPES_D_OPERATION } from "@/components/stock/operations/types-d-operation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { TypeOperationDeStock } from "@/types"
import { t, tr } from "@/i18n"

type NouvelleOperationFenetreProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Appelé dès qu'on clique sur un type : ouvre directement sa fenêtre */
  onChoisir: (type: TypeOperationDeStock) => void
}

/** Figma : `nouvelle_operation_de_stock_fenetre` — un clic sur un type ouvre directement son formulaire. */
export function NouvelleOperationFenetre({ open, onOpenChange, onChoisir }: NouvelleOperationFenetreProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-lg p-0 shadow-card ring-0 sm:max-w-[514px]"
      >
        {/* en_tete_de_la_fenetre */}
        <div className="flex min-h-24 items-center justify-between gap-4 border-b border-grid-line px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <PackageOpen className="size-[30px]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-2xl leading-tight font-bold">{t("Nouvelle opération de stock")}</DialogTitle>
              <DialogDescription className="text-sm">{t("Choisissez le type d’opération à créer.")}</DialogDescription>
            </div>
          </div>
          <DialogClose
            render={<Button variant="outline" aria-label={t("Fermer")} className="size-11 shrink-0 rounded-sm border-grid-line p-0" />}
          >
            <X className="size-5" />
          </DialogClose>
        </div>

        {/* types_d_operation */}
        <div className="flex flex-wrap justify-center gap-3 px-3 pt-5 pb-6">
          {ORDRE_DES_TYPES.map((type, index) => {
            const { libelleCourt, description, icone: Icone, couleurPastille } = TYPES_D_OPERATION[type]
            return (
              <Button
                key={type}
                variant="outline"
                onClick={() => onChoisir(type)}
                className={cn(
                  "h-auto min-h-[150px] flex-col justify-start gap-2 rounded-lg border-border bg-card p-4 text-center whitespace-normal shadow-card hover:border-primary hover:bg-card",
                  // 3 cartes carrées puis 2 cartes plus larges, comme dans Figma
                  index < 3 ? "w-[150px]" : "w-[182px]"
                )}
              >
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", couleurPastille)}>
                  <Icone className="size-6" />
                </span>
                <span className="text-sm font-bold">{libelleCourt}</span>
                <span className="text-xs leading-[1.4] font-normal text-muted-foreground">{tr(description)}</span>
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
