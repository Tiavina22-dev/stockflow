import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState, type ReactNode } from "react"
import { ArrowLeft, Banknote, Calculator, Camera, Check, type LucideIcon } from "lucide-react"

import { ZoneDeJustificatifs } from "@/components/cahier/zone-de-justificatifs"
import { MontantEnLettres } from "@/components/donnees/montant-en-lettres"
import { ariary } from "@/components/donnees/montants"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ChampNombre } from "@/components/forms/champ-nombre"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { SaisieDuCahier } from "@/types"
import { t, tr } from "@/i18n"

const nombre = new Intl.NumberFormat("fr-FR")
/** « 35 000 » / « 35000,5 » → nombre ; null si vide ou invalide. */
const lireNombre = (texte: string) => {
  const n = Number(texte.replace(/\s/g, "").replace(",", "."))
  return texte.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n
}

/**
 * Étape « Continuer vers la validation » de la saisie du cahier (pas de maquette Figma : même style que
 * `saisie_du_cahier`). Récapitulatif, argent réellement versé avec manque / surplus, photos du cahier papier.
 */
export function FenetreDeValidation({
  ouverte,
  onFermer,
  totalVentes,
  totalDepenses,
  nombreDeLignes,
  onValider,
  draft,
}: {
  ouverte: boolean
  onFermer: () => void
  draft?: LocalDraft
  totalVentes: number
  totalDepenses: number
  nombreDeLignes: number
  /** Rejette avec `Error(message)` en cas de refus ; la fenêtre reste alors ouverte */
  onValider: (versement: SaisieDuCahier["versement"], photos: File[]) => Promise<void>
}) {
  return (
    <Dialog open={ouverte} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[94svh] overflow-y-auto p-0 sm:max-w-[760px]">
        {ouverte && <Contenu draft={draft} onFermer={onFermer} totalVentes={totalVentes} totalDepenses={totalDepenses} nombreDeLignes={nombreDeLignes} onValider={onValider} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenu({
  onFermer,
  totalVentes,
  totalDepenses,
  nombreDeLignes,
  onValider,
  draft,
}: {
  onFermer: () => void
  draft?: LocalDraft
  totalVentes: number
  totalDepenses: number
  nombreDeLignes: number
  onValider: (versement: SaisieDuCahier["versement"], photos: File[]) => Promise<void>
}) {
  const reste = totalVentes - totalDepenses
  const [montantVerse, setMontantVerse] = useDraftState(draft, "montantVerse", "")
  const [note, setNote] = useDraftState(draft, "versementNote", "")
  const [photos, setPhotos] = useDraftState<File[]>(draft, "photos", [])
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const verse = lireNombre(montantVerse)
  const ecart = verse === null ? null : verse - reste

  const valider = async () => {
    setErreur(null)
    if (montantVerse.trim() && verse === null) return setErreur(t("Le montant versé est invalide."))
    if (ecart !== null && ecart !== 0 && !note.trim()) return setErreur(t("Précisez dans la note la raison du {{v0}}.", { v0: ecart < 0 ? "manque" : "surplus" }))
    setEnCours(true)
    try {
      await onValider({ montantRemis: verse, note: note.trim() }, photos)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t("La validation a échoué."))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle className="text-[22px] leading-tight font-bold">{t("Validation du cahier")}</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">{t("Indiquez l’argent réellement versé et joignez les photos du cahier papier.")}</DialogDescription>
      </div>

      {/* recapitulatif */}
      <Bloc icone={Calculator} titre={t("Récapitulatif")}>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Total libelle={t("Total ventes ({{v0}} ligne{{v1}})", { v0: nombre.format(nombreDeLignes), v1: nombreDeLignes > 1 ? "s" : "" })} valeur={ariary.format(totalVentes)} />
          <Total libelle={t("Total dépenses")} valeur={ariary.format(totalDepenses)} />
          <div className={cn("flex flex-col gap-1 rounded-sm p-3", reste < 0 ? "bg-danger-muted text-destructive" : "bg-success-muted text-success")}>
            <dt className="text-xs font-semibold">{t("Reste à verser")}</dt>
            <dd className="text-lg font-bold tabular-nums">{ariary.format(reste)}</dd>
          </div>
        </dl>
        <MontantEnLettres montant={reste} className="text-right" />
      </Bloc>

      {/* versement */}
      <Bloc icone={Banknote} titre={t("Versement")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="validation-verse" className="text-xs font-semibold">
              {t("Montant réellement versé (Ar)")}
            </label>
            <ChampNombre
              id="validation-verse"
              autoFocus
              valeur={montantVerse}
              onChange={setMontantVerse}
              placeholder={String(Math.max(0, reste))}
              aria-invalid={montantVerse !== "" && verse === null}
              className="h-12 rounded-sm border-input px-4 text-right text-sm tabular-nums md:text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold">{t("Manque / surplus")}</span>
            <p
              className={cn(
                "flex h-12 items-center justify-between rounded-sm px-4 text-sm font-semibold",
                ecart === null ? "bg-background text-muted-foreground" : ecart < 0 ? "bg-danger-muted text-destructive" : ecart > 0 ? "bg-caution-muted text-caution" : "bg-success-muted text-success"
              )}
            >
              <span>{ecart === null ? t("Saisissez le montant versé") : ecart < 0 ? t("Manque") : ecart > 0 ? t("Surplus") : t("Versement juste")}</span>
              <span className="tabular-nums">{ecart === null || ecart === 0 ? "" : ariary.format(Math.abs(ecart))}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="validation-note" className="text-xs font-semibold">
            {t("Note")} {ecart !== null && ecart !== 0 ? "*" : t("(facultatif)")}
          </label>
          <Input id="validation-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Ex. versé à la gérante, billet abîmé…")} className="h-12 rounded-sm border-input px-4 text-sm md:text-sm" />
        </div>
      </Bloc>

      {/* photos */}
      <Bloc icone={Camera} titre={t("Photos du cahier papier")} description={t("Justificatifs : les ventes sont recopiées à la main, les photos ne sont pas lues automatiquement.")}>
        <ZoneDeJustificatifs photos={photos} onChange={setPhotos} />
      </Bloc>

      {erreur && (
        <p role="alert" className="rounded-sm bg-danger-muted px-3.5 py-2.5 text-[13px] text-destructive">
          {tr(erreur)}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" disabled={enCours} onClick={onFermer} className="h-11 gap-2 rounded-sm border-grid-line px-4 text-[13px] text-primary">
          <ArrowLeft className="size-4" />
          {t("Retour à la saisie")}
        </Button>
        <Button type="button" disabled={enCours} onClick={valider} className="h-11 gap-2 rounded-sm px-5 text-[13px] font-semibold">
          <Check className="size-4" />
          {enCours ? t("Validation…") : t("Valider le cahier")}
        </Button>
      </div>
    </div>
  )
}

function Bloc({ icone: Icone, titre, description, children }: { icone: LucideIcon; titre: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-lg border border-grid-line bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <Icone className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold">{tr(titre)}</h3>
          {description && <p className="text-xs text-muted-foreground">{tr(description)}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Total({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-sm bg-background p-3">
      <dt className="text-xs text-muted-foreground">{tr(libelle)}</dt>
      <dd className="text-lg font-bold tabular-nums">{valeur}</dd>
    </div>
  )
}
