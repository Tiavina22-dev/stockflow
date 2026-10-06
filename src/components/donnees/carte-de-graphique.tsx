import { useState, type ReactNode } from "react"
import { Maximize2, X, type LucideIcon } from "lucide-react"

import { CarteAvecTitre } from "@/components/donnees/carte-avec-titre"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { t, tr } from "@/i18n"

type CarteDeGraphiqueProps = {
  icone: LucideIcon
  titre: string
  /** Contrôles à droite du titre (période, mesure…) — repris en plein écran */
  action?: ReactNode
  /** Rendu du graphique ; `pleinEcran` permet d'agrandir sa hauteur */
  children: (pleinEcran: boolean) => ReactNode
  className?: string
}

/**
 * Carte de graphique cliquable : un clic sur le graphique (ou sur « Agrandir »)
 * l'affiche en plein écran. Échap, la croix ou un clic à côté le referment.
 */
export function CarteDeGraphique({ icone: Icone, titre, action, children, className }: CarteDeGraphiqueProps) {
  const [pleinEcran, setPleinEcran] = useState(false)

  return (
    <>
      <CarteAvecTitre
        icone={Icone}
        titre={tr(titre)}
        className={className}
        action={
          <div className="flex items-center gap-2">
            {action}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("Afficher « {{v0}} » en plein écran", { v0: titre })}
              title={t("Plein écran")}
              onClick={() => setPleinEcran(true)}
              className="text-muted-foreground"
            >
              <Maximize2 />
            </Button>
          </div>
        }
      >
        <div
          role="button"
          tabIndex={-1}
          title={t("Cliquer pour afficher en plein écran")}
          onClick={(e) => {
            // Un clic sur un contrôle interne (liste, bouton) ne doit pas ouvrir le plein écran
            if ((e.target as HTMLElement).closest("button, a, [role=combobox], [role=listbox]")) return
            setPleinEcran(true)
          }}
          className="cursor-zoom-in"
        >
          {children(false)}
        </div>
      </CarteAvecTitre>

      <Dialog open={pleinEcran} onOpenChange={setPleinEcran}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-4 rounded-lg p-6 sm:max-w-none"
        >
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Icone className="size-5 text-primary" />
              {tr(titre)}
            </DialogTitle>
            <DialogDescription className="sr-only">{t("Graphique en plein écran")}</DialogDescription>
            <div className="flex items-center gap-2">
              {action}
              <DialogClose render={<Button variant="outline" aria-label={t("Quitter le plein écran")} className="size-9 rounded-sm border-grid-line p-0" />}>
                <X className="size-5" />
              </DialogClose>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{children(true)}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
