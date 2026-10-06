import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChartNoAxesColumnIncreasing, Check, ClipboardList, FileText, Info, Loader2, Package, Store, Tag, X } from "lucide-react"

import { ariary, ariarySigne } from "@/components/donnees/montants"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { t, tr } from "@/i18n"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import type { DecisionDePrix, PrixAVerifier, VerificationDePrix } from "@/types"

const pourcent = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" })

type PrixAVerifierFenetreProps = {
  draft?: LocalDraft
  ouverte: boolean
  onOuvertureChange: (ouverte: boolean) => void
  /** Absente pendant le chargement */
  verification: VerificationDePrix | undefined
  onValider: (decisions: { id: string; decision: DecisionDePrix }[]) => Promise<void>
}

/** Figma : `prix_a_verifier_fenetre` (node 253:2703) — valider ou refuser les nouveaux prix détectés. */
export function PrixAVerifierFenetre({ draft, ouverte, onOuvertureChange, verification, onValider }: PrixAVerifierFenetreProps) {
  return (
    <Dialog open={ouverte} onOpenChange={onOuvertureChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-[18px] p-0 shadow-card ring-0 sm:max-w-[1026px]"
      >
        {verification ? (
          <Contenu draft={draft} key={verification.origine} verification={verification} onValider={onValider} onFermer={() => onOuvertureChange(false)} />
        ) : (
          <p role="status" className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("Chargement des prix…")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Contenu({ draft, verification, onValider, onFermer }: { draft?: LocalDraft; verification: VerificationDePrix; onValider: PrixAVerifierFenetreProps["onValider"]; onFermer: () => void }) {
  // Par défaut, chaque nouveau prix est proposé à la validation (comme sur la maquette)
  const [decisions, setDecisions] = useDraftState<Record<string, DecisionDePrix>>(draft, "decisions", () => Object.fromEntries(verification.lignes.map((l) => [l.id, "valider"])))
  const [enregistrement, setEnregistrement] = useState(false)
  const nombreAValider = verification.lignes.filter((l) => (decisions[l.id] ?? "valider") === "valider").length
  const impact = verification.lignes.reduce((s, l) => s + ((decisions[l.id] ?? "valider") === "valider" ? (l.ancienPrix === null ? 0 : l.nouveauPrix - l.ancienPrix) * l.stockActuel : 0), 0)

  const valider = async () => {
    setEnregistrement(true)
    try {
      await onValider(verification.lignes.map((l) => ({ id: l.id, decision: (decisions[l.id] ?? "valider") })))
      notify("success", t("{{v0}} prix validé(s), {{v1}} refusé(s).", { v0: nombreAValider, v1: verification.lignes.length - nombreAValider }))
      onFermer()
    } catch (e) {
      notify("error", e instanceof Error ? tr(e.message) : t("L’enregistrement a échoué."))
    } finally {
      setEnregistrement(false)
    }
  }

  return (
    <div className="flex max-h-[calc(100svh-2rem)] flex-col">
      <div className="flex flex-col gap-[22px] overflow-y-auto p-[26px] pb-4">
        {/* en_tete */}
        <div className="flex items-start gap-[18px]">
          <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Tag className="size-8" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle className="text-[28px] leading-tight font-bold">{t("Prix à vérifier")}</DialogTitle>
            <DialogDescription className="text-sm">{t("Validez ou refusez les nouveaux prix détectés.")}</DialogDescription>
          </div>
          <DialogClose render={<Button variant="ghost" aria-label={t("Fermer")} className="size-[34px] rounded-sm p-0" />}>
            <X className="size-[18px]" />
          </DialogClose>
        </div>

        {/* contexte */}
        <div className="flex flex-wrap gap-3.5">
          <Contexte icone={Store}>
            {t("Magasin :")} {verification.magasinNom}
          </Contexte>
          <Contexte icone={FileText}>
            {t("Origine :")} {tr(verification.origine)}
          </Contexte>
        </div>

        {/* liste_produits */}
        {verification.lignes.length === 0 ? (
          <p className="rounded-sm border border-dashed border-grid-line py-8 text-center text-sm text-muted-foreground">{t("Aucun nouveau prix à vérifier.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[15px] [&_td,&_th]:border [&_td,&_th]:border-muted-foreground/25 [&_td]:px-3 [&_td]:py-4 [&_th]:bg-background [&_th]:px-3 [&_th]:py-3 [&_th]:text-center [&_th]:text-[13px] [&_th]:font-bold">
              <thead>
                <tr>
                  <th>{t("Produit")}</th>
                  <th className="w-[150px]">{t("Ancien prix")}</th>
                  <th className="w-[150px]">{t("Nouveau prix")}</th>
                  <th className="w-[140px]">{t("Écart")}</th>
                  <th className="w-[130px]">{t("Décision")}</th>
                </tr>
              </thead>
              <tbody>
                {verification.lignes.map((l) => (
                  <LigneDePrix key={l.id} ligne={l} decision={(decisions[l.id] ?? "valider")} onDecision={(d) => setDecisions((ds) => ({ ...ds, [l.id]: d }))} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* resume_verification */}
        <div className="grid items-center gap-5 rounded-lg bg-accent/60 p-[18px] md:grid-cols-[auto_1px_auto_1px_minmax(0,1fr)]">
          <div className="flex items-center gap-[18px]">
            <span className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <ClipboardList className="size-[30px]" />
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-[22px] font-bold text-primary">{t("{{v0}} prix en attente", { v0: verification.lignes.length })}</p>
              <p className="text-sm text-muted-foreground">{t("à valider ou refuser")}</p>
            </div>
          </div>
          <span className="hidden h-[60px] bg-grid-line md:block" />
          <div className="flex items-center gap-[18px]">
            <span className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-success-muted text-success">
              <ChartNoAxesColumnIncreasing className="size-[30px]" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm">{t("Impact estimé")}</p>
              <p className={cn("text-xl font-bold tabular-nums", impact > 0 ? "text-destructive" : impact < 0 ? "text-success" : "text-foreground")}>{ariarySigne.format(impact)}</p>
              <p className="text-xs text-muted-foreground">{verification.lignes.some(l => l.ancienPrix === null) ? t("Estimation partielle : certains anciens prix sont inconnus.") : t("sur le stock actuel")}</p>
            </div>
          </div>
          <span className="hidden h-[60px] bg-grid-line md:block" />
          <p className="flex gap-3 text-[13px] leading-[1.4] text-muted-foreground">
            <Info className="size-5 shrink-0 text-primary" />
            {t("En validant, le prix fournisseur sera mis à jour dans le catalogue et l’historique des prix sera conservé.")}
          </p>
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 justify-end gap-3 px-[26px] pt-4 pb-[26px]">
        <DialogClose render={<Button variant="outline" disabled={enregistrement} title={t("Fermer sans décider : les prix restent en attente.")} className="h-11 rounded-sm border-grid-line px-[22px] text-sm font-normal" />}>
          {t("Ignorer")}
        </DialogClose>
        <Button onClick={valider} disabled={enregistrement || verification.lignes.length === 0} className="h-11 gap-2.5 rounded-sm px-[22px] text-sm font-semibold">
          {enregistrement ? <Loader2 className="size-[18px] animate-spin" /> : <Check className="size-[18px]" />}
          {t("Valider les prix")}
        </Button>
      </div>
    </div>
  )
}

function Contexte({ icone: Icone, children }: { icone: typeof Store; children: ReactNode }) {
  return (
    <p className="flex h-[50px] items-center gap-3 rounded-sm border border-grid-line bg-surface px-4 text-[15px] text-muted-foreground">
      <Icone className="size-[22px] shrink-0 text-primary" />
      {children}
    </p>
  )
}

function LigneDePrix({ ligne: l, decision, onDecision }: { ligne: PrixAVerifier; decision: DecisionDePrix; onDecision: (d: DecisionDePrix) => void }) {
  const ecart = l.ancienPrix === null ? 0 : l.nouveauPrix - l.ancienPrix
  const hausse = ecart > 0
  const taux = l.ancienPrix !== null && l.ancienPrix > 0 ? ecart / l.ancienPrix : null
  return (
    <tr>
      <td>
        <div className="flex items-center gap-4">
          {l.photoUrl ? (
            <img src={l.photoUrl} alt="" className="size-[68px] shrink-0 rounded-[4px] object-cover" />
          ) : (
            <span className="flex size-[68px] shrink-0 items-center justify-center rounded-[4px] bg-muted text-muted-foreground">
              <Package className="size-7" />
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] font-semibold">{l.produitNom}</span>
            <span className="text-[13px] text-muted-foreground">
              {t("Réf.")} {l.reference}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">{l.fournisseurNom}</span>
          </span>
        </div>
      </td>
      <td className="text-right tabular-nums">{l.ancienPrix === null ? t("Non renseigné") : ariary.format(l.ancienPrix)}</td>
      <td className="text-right font-semibold tabular-nums">{ariary.format(l.nouveauPrix)}</td>
      <td>
        <span className={cn("inline-flex flex-col rounded-sm px-2 py-1", hausse ? "bg-danger-muted" : ecart < 0 ? "bg-success-muted" : "bg-muted")}>
          <span className={cn("flex items-center gap-1.5 text-[17px] font-semibold tabular-nums", hausse ? "text-destructive" : ecart < 0 ? "text-success" : "text-muted-foreground")}>
            {hausse ? <ArrowUp className="size-4" /> : ecart < 0 ? <ArrowDown className="size-4" /> : null}
            {taux === null ? t("Non calculable") : `${pourcent.format(taux * 100)}%`}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{l.ancienPrix === null ? t("Non calculable") : ariarySigne.format(ecart)}</span>
        </span>
      </td>
      <td>
        <div
          role="radiogroup"
          aria-label={t("Décision pour {{v0}}", { v0: l.produitNom })}
          className={cn("ml-auto flex w-fit flex-col rounded-sm border px-1 py-0.5", decision === "refuser" ? "border-destructive/40 bg-danger-muted" : "border-primary/40 bg-accent/60")}
        >
          <ChoixDeDecision actif={decision === "valider"} onClick={() => onDecision("valider")} icone={Check} libelle="Valider" classeActive="text-primary" />
          <ChoixDeDecision actif={decision === "refuser"} onClick={() => onDecision("refuser")} icone={X} libelle="Refuser" classeActive="text-destructive" />
        </div>
      </td>
    </tr>
  )
}

function ChoixDeDecision({ actif, onClick, icone: Icone, libelle, classeActive }: { actif: boolean; onClick: () => void; icone: typeof Check; libelle: string; classeActive: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onClick}
      className={cn(
        "flex h-[26px] items-center gap-2 rounded-[4px] px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        actif ? cn("font-semibold", classeActive) : "text-foreground hover:bg-background/70"
      )}
    >
      <Icone className="size-3.5" />
      {tr(libelle)}
    </button>
  )
}
