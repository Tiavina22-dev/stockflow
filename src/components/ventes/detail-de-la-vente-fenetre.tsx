import { t, tr, formatDate } from "@/i18n"
import { MontantEnLettres } from "@/components/donnees/montant-en-lettres"
import { ariary } from "@/components/donnees/montants"
import type { ReactNode } from "react"
import { Banknote, BadgeCheck, Calendar, Package, Pencil, ShoppingCart, Store, User, X, type LucideIcon } from "lucide-react"

import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { ArticlesVendus } from "@/components/ventes/articles-vendus"
import { TON_PAR_STATUT_DE_VENTE } from "@/components/ventes/statut-de-vente"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { AsyncState, DetailDeVente } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const dateHeure = formatDate({ dateStyle: "short", timeStyle: "short" })

type DetailDeLaVenteFenetreProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Numéro affiché pendant le chargement */
  venteNumero?: string
  detail: AsyncState<DetailDeVente>
  onModifier?: (vente: DetailDeVente) => void
}

/** Figma : `detail_de_la_vente_8561` (node 90:2625). */
export function DetailDeLaVenteFenetre({ open, onOpenChange, venteNumero, detail, onModifier }: DetailDeLaVenteFenetreProps) {
  const vente = detail.data
  const numero = vente?.venteNumero ?? venteNumero ?? ""
  const totalArticles = vente?.articles.reduce((somme, a) => somme + a.produitQuantite, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-lg border border-grid-line p-0 shadow-card ring-0 sm:max-w-[860px]"
      >
        <div className="flex max-h-[calc(100svh-2rem)] flex-col">
          {/* en_tete */}
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-grid-line px-6">
            <div className="flex items-center gap-4">
              <span className="flex size-[46px] items-center justify-center rounded-full bg-accent text-primary">
                <ShoppingCart className="size-[23px]" />
              </span>
              <DialogTitle className="text-2xl font-bold">{t("Détail de la vente")} {numero}</DialogTitle>
              <DialogDescription className="sr-only">{t("Informations, articles vendus et total de la vente.")}</DialogDescription>
            </div>
            <DialogClose render={<Button variant="outline" aria-label={t("Fermer")} className="size-10 rounded-md border-grid-line p-0" />}>
              <X className="size-6" />
            </DialogClose>
          </div>

          {detail.isLoading && <p className="p-10 text-center text-sm text-muted-foreground">{t("Chargement de la vente…")}</p>}
          {detail.error && (
            <p role="alert" className="p-10 text-center text-sm text-destructive">
              {detail.error}
            </p>
          )}

          {vente && (
            <>
              {/* informations_de_vente */}
              <div className="flex min-h-[92px] shrink-0 flex-wrap items-center gap-x-10 gap-y-3 border-b border-grid-line px-6 py-4">
                <Metadonnee icone={Calendar} libelle={t("Date et heure")}>
                  {dateHeure.format(new Date(vente.venteDate))}
                </Metadonnee>
                <Metadonnee icone={User} libelle={t("Vendeur")}>
                  {vente.vendeurNom}
                </Metadonnee>
                <Metadonnee icone={Store} libelle={t("Magasin")}>
                  {vente.magasinNom}
                </Metadonnee>
                <Metadonnee icone={BadgeCheck} libelle={t("Statut")}>
                  <PastilleEtat libelle={tr(vente.statut)} ton={TON_PAR_STATUT_DE_VENTE[vente.statut]} className="text-[13px] font-semibold" />
                </Metadonnee>
              </div>

              {/* corps */}
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
                <h3 className="text-base font-bold">{t("Articles vendus")}</h3>
                <ArticlesVendus articles={vente.articles} className="min-h-[200px]" />

                {vente.note && (
                  <p className="rounded-lg border border-grid-line bg-background px-4 py-3 text-[13px]">
                    <span className="font-semibold">{t("Note :")} </span>
                    {vente.note}
                  </p>
                )}

                {/* recapitulatif */}
                <div className="grid shrink-0 gap-3 sm:grid-cols-2">
                  <Recapitulatif icone={Package} libelle={t("Total articles")} className="bg-background" pastille="bg-accent text-primary">
                    <span className="text-lg font-bold">{nombre.format(totalArticles)}</span>
                  </Recapitulatif>
                  <Recapitulatif icone={Banknote} libelle={t("Total de la vente")} className="bg-accent" pastille="bg-card text-primary">
                    <span className="text-lg font-bold text-primary tabular-nums">{ariary.format(vente.venteMontant)}</span>
                    <MontantEnLettres montant={vente.venteMontant} />
                    {vente.remise > 0 && (
                      <span className="text-[11px] text-muted-foreground">{t("dont remise")} {ariary.format(vente.remise)}</span>
                    )}
                  </Recapitulatif>
                </div>
              </div>
            </>
          )}

          {/* actions */}
          <div className="flex h-[72px] shrink-0 items-center justify-end gap-3 border-t border-grid-line px-6">
            <DialogClose render={<Button variant="outline" className="h-11 rounded-md border-grid-line px-[18px] text-[13px] font-semibold" />}>
              {t("Fermer")}
            </DialogClose>
            <Button
              disabled={!vente || vente.statut === "Annulée"}
              title={vente?.statut === "Annulée" ? t("Une vente annulée ne peut pas être modifiée") : undefined}
              onClick={() => vente && onModifier?.(vente)}
              className="h-11 gap-2 rounded-md px-[18px] text-[13px] font-semibold"
            >
              <Pencil className="size-[18px]" />
              {t("Modifier la vente")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Metadonnee({ icone: Icone, libelle, children }: { icone: LucideIcon; libelle: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icone className="size-[21px]" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted-foreground">{tr(libelle)}</span>
        <span className="text-sm font-semibold">{children}</span>
      </div>
    </div>
  )
}

function Recapitulatif({
  icone: Icone,
  libelle,
  pastille,
  className,
  children,
}: {
  icone: LucideIcon
  libelle: string
  pastille: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex h-[72px] items-center gap-3 rounded-lg border border-grid-line px-4", className)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", pastille)}>
        <Icone className="size-[18px]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{tr(libelle)}</span>
        {children}
      </div>
    </div>
  )
}
