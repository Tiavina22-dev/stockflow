import type { ReactNode } from "react"

import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { ECRAN_PAR_CATEGORIE, ICONE_PAR_CATEGORIE, libelleDOperation, TON_PAR_STATUT_D_OPERATION, valeurPrincipale } from "@/components/historique/categories-d-operation"
import { QuantiteSignee } from "@/components/historique/liste-des-operations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { OperationDHistorique } from "@/types"
import { t, tr, formatDate } from "@/i18n"

const dateComplete = formatDate({ dateStyle: "full", timeStyle: "short" })

/** Fenêtre ouverte par l'œil d'une ligne de l'historique (pas de maquette dédiée : reprend les cellules de la liste). */
export function DetailDeLOperationFenetre({
  operation,
  onFermer,
}: {
  operation: OperationDHistorique | null
  onFermer: () => void
}) {
  return (
    <Dialog open={operation !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent className="sm:max-w-[520px]">
        {operation && <Contenu operation={operation} onFermer={onFermer} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenu({ operation: o, onFermer }: { operation: OperationDHistorique; onFermer: () => void }) {
  const { icone: Icone, fond, texte } = ICONE_PAR_CATEGORIE[o.categorie]
  const ecran = ECRAN_PAR_CATEGORIE[o.categorie]

  return (
    <>
      <DialogHeader className="flex-row items-center gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", fond, texte)}>
          <Icone className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle className="truncate">{libelleDOperation(o)}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">{dateComplete.format(new Date(o.date))}</DialogDescription>
        </div>
        <PastilleEtat ton={TON_PAR_STATUT_D_OPERATION[o.statut]} libelle={tr(o.statut)} className="mr-7 ml-auto h-[26px] font-semibold" />
      </DialogHeader>

      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 rounded-lg bg-background p-4 text-[13px]">
        <Ligne terme="Type">{tr(o.type)}</Ligne>
        <Ligne terme="Magasin">{o.magasinNom}</Ligne>
        <Ligne terme="Utilisateur">{o.utilisateurNom}</Ligne>
        <Ligne terme="Origine">{tr(o.source)}</Ligne>
        <Ligne terme="Référence">
          {o.reference}
          {o.referenceDetail && <span className="block text-xs text-muted-foreground">{o.referenceDetail}</span>}
        </Ligne>
        <Ligne terme="Quantité">
          <QuantiteSignee quantite={o.quantite} className="text-[13px]" />
        </Ligne>
        <Ligne terme="Valeur">
          {valeurPrincipale(o)}
          {o.montant !== null && o.detailValeur && <span className="block text-xs text-muted-foreground">{o.detailValeur}</span>}
        </Ligne>
        {o.motif && <Ligne terme="Motif">{o.motif}</Ligne>}
      </dl>

      <DialogFooter>
        <Button variant="outline" onClick={onFermer} className="h-10 rounded-sm">
          {t("Fermer")}
        </Button>
        <Button render={<a href={ecran.lien} />} className="h-10 rounded-sm">
          {t("Ouvrir dans")} {tr(ecran.libelle)}
        </Button>
      </DialogFooter>
    </>
  )
}

function Ligne({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{terme}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </>
  )
}
