import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState, type ReactNode } from "react"
import {
  Calculator,
  ClipboardList,
  FileText,
  Hash,
  IdCard,
  Landmark,
  Loader2,
  MapPin,
  Package,
  Phone,
  Receipt,
  Save,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react"

import { ariary } from "@/components/donnees/montants"
import { MontantEnLettres } from "@/components/donnees/montant-en-lettres"
import { ChampAvecIcone, ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { ChampDate, dateDuJour } from "@/components/forms/champ-date"
import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { t, tr } from "@/i18n"
import { notify } from "@/lib/notify"
import type { ClientDeFacture, DetailDeVente, FactureClientCreee, SaisieDeFactureClient } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

type FenetreDeFactureClientProps = {
  draft?: LocalDraft
  ouverte: boolean
  onOuvertureChange: (ouverte: boolean) => void
  /** Vente validée à facturer ; absente pendant le chargement */
  vente: DetailDeVente | undefined
  clients: ClientDeFacture[]
  /** Prochain numéro prévu (affichage) ; null = attribué à l'enregistrement */
  numeroPrevu: string | null
  onEnregistrer: (saisie: SaisieDeFactureClient) => Promise<FactureClientCreee>
}

/** Figma : `facture_client_fenetre` (node 253:2549) — créer une facture à partir d'une vente validée. */
export function FenetreDeFactureClient({ ouverte, onOuvertureChange, ...props }: FenetreDeFactureClientProps) {
  return (
    <Dialog open={ouverte} onOpenChange={onOuvertureChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-[18px] p-0 shadow-card ring-0 sm:max-w-[882px]"
      >
        {/* Le formulaire repart de zéro à chaque vente */}
        {props.vente ? (
          <FormulaireDeFacture key={props.vente.id} {...props} vente={props.vente} onFermer={() => onOuvertureChange(false)} />
        ) : (
          <p role="status" className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("Chargement de la vente…")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormulaireDeFacture({ draft,
  vente,
  clients,
  numeroPrevu,
  onEnregistrer,
  onFermer,
}: Omit<FenetreDeFactureClientProps, "ouverte" | "onOuvertureChange"> & { vente: DetailDeVente; onFermer: () => void }) {
  const [saisie, setSaisie] = useDraftState<SaisieDeFactureClient>(draft, "saisie", {
    venteId: vente.id,
    dateDeFacture: dateDuJour(),
    clientId: "",
    clientNom: "",
    nif: "",
    stat: "",
    adresse: "",
    telephone: "",
    conditions: "",
  })
  const [verifier, setVerifier] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const modifier = (m: Partial<SaisieDeFactureClient>) => setSaisie((s) => ({ ...s, ...m }))

  const sousTotal = vente.articles.reduce((s, a) => s + a.produitQuantite * a.produitPrixUnitaire, 0)
  const pourcentage = sousTotal > 0 ? Math.round((vente.remise / sousTotal) * 1000) / 10 : 0
  const erreurClient = verifier && !saisie.clientId ? "Choisissez le client." : undefined

  const choisirClient = (id: string) => {
    const c = clients.find((x) => x.id === id)
    if (c) modifier({ clientId: c.id, clientNom: c.nom, nif: c.nif, stat: c.stat, adresse: c.adresse, telephone: c.telephone })
  }

  const enregistrer = async () => {
    setVerifier(true)
    if (!saisie.clientId) return
    setEnregistrement(true)
    try {
      const facture = await onEnregistrer({ ...saisie, clientNom: saisie.clientNom.trim(), conditions: saisie.conditions.trim() })
      notify("success", t("Facture {{v0}} enregistrée.", { v0: facture.numero }))
      onFermer()
    } catch (e) {
      notify("error", e instanceof Error ? tr(e.message) : t("L’enregistrement a échoué."))
    } finally {
      setEnregistrement(false)
    }
  }

  return (
    <div className="flex max-h-[calc(100svh-2rem)] flex-col">
      <div className="flex flex-col gap-4 overflow-y-auto p-[22px]">
        {/* en_tete */}
        <div className="flex items-start gap-[18px]">
          <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <FileText className="size-8" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle className="text-2xl font-bold">{t("Facture client")}</DialogTitle>
            <DialogDescription className="text-sm">{t("Créer une facture à partir d’une vente validée.")}</DialogDescription>
          </div>
          <DialogClose render={<Button variant="secondary" aria-label={t("Fermer")} className="size-[34px] rounded-sm p-0" />}>
            <X className="size-[18px]" />
          </DialogClose>
        </div>

        {/* references_facture */}
        <div className="grid gap-5 sm:grid-cols-3">
          <ChampDeFormulaire id="facture-vente" libelle="Vente liée">
            <ChampAvecIcone id="facture-vente" icone={Receipt} value={vente.venteNumero} readOnly className="[&_input]:bg-background" />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="facture-date" libelle="Date de facture">
            <ChampDate aria-label={t("Date de facture")} valeur={saisie.dateDeFacture} max={dateDuJour()} onChange={(dateDeFacture) => modifier({ dateDeFacture })} />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="facture-numero" libelle="N° facture">
            <ChampAvecIcone
              id="facture-numero"
              icone={Hash}
              value={numeroPrevu ?? t("Attribué à l’enregistrement")}
              readOnly
              title={t("Numéro attribué automatiquement (Paramètres → Facturation).")}
              className="[&_input]:bg-background"
            />
          </ChampDeFormulaire>
        </div>

        <hr className="border-grid-line" />

        {/* informations_client */}
        <Section icone={UserRound} titre="Informations client">
          <div className="grid gap-5 sm:grid-cols-[366fr_216fr_216fr]">
            <ChampDeFormulaire id="facture-client" libelle="Client" obligatoire erreur={erreurClient}>
              <SelectAvecIcone
                id="facture-client"
                icone={Landmark}
                aria-label={t("Client")}
                aria-invalid={!!erreurClient}
                placeholder={clients.length ? t("Choisir un client…") : t("Aucun client dans ce magasin")}
                options={clients.map((c) => ({ value: c.id, label: c.nom }))}
                valeur={saisie.clientId || null}
                onChange={choisirClient}
              />
            </ChampDeFormulaire>
            <ChampDeFormulaire id="facture-nif" libelle="NIF">
              <ChampAvecIcone id="facture-nif" icone={IdCard} value={saisie.nif} onChange={(e) => modifier({ nif: e.target.value })} />
            </ChampDeFormulaire>
            <ChampDeFormulaire id="facture-stat" libelle="STAT">
              <ChampAvecIcone id="facture-stat" icone={IdCard} value={saisie.stat} onChange={(e) => modifier({ stat: e.target.value })} />
            </ChampDeFormulaire>
          </div>
          <div className="grid gap-5 sm:grid-cols-[575fr_243fr]">
            <ChampDeFormulaire id="facture-adresse" libelle="Adresse">
              <ChampAvecIcone id="facture-adresse" icone={MapPin} value={saisie.adresse} onChange={(e) => modifier({ adresse: e.target.value })} />
            </ChampDeFormulaire>
            <ChampDeFormulaire id="facture-telephone" libelle="Téléphone">
              <ChampAvecIcone id="facture-telephone" icone={Phone} inputMode="tel" value={saisie.telephone} onChange={(e) => modifier({ telephone: e.target.value })} />
            </ChampDeFormulaire>
          </div>
        </Section>

        <hr className="border-grid-line" />

        {/* produits_vente */}
        <Section icone={Package} titre="Produits de la vente liée">
          <div className="overflow-x-auto rounded-sm">
            <table className="w-full min-w-[560px] border-collapse text-sm [&_td,&_th]:border [&_td,&_th]:border-muted-foreground/25 [&_td]:px-3 [&_td]:py-2 [&_th]:bg-background [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-center [&_th]:text-xs [&_th]:font-bold">
              <thead>
                <tr>
                  <th>{t("Produit")}</th>
                  <th className="w-[80px]">{t("Qté")}</th>
                  <th className="w-[120px]">{t("Prix unitaire")}</th>
                  <th className="w-[130px]">{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {vente.articles.map((a) => (
                  <tr key={a.produitId}>
                    <td>
                      <div className="flex items-center gap-3">
                        {a.photoUrl ? (
                          <img src={a.photoUrl} alt="" className="size-11 shrink-0 rounded-[4px] object-cover" />
                        ) : (
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-[4px] bg-muted text-muted-foreground">
                            <Package className="size-5" />
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-semibold">{a.produitNom}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {t("Réf.")} {a.produitReference}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{nombre.format(a.produitQuantite)}</td>
                    <td className="text-right tabular-nums">{ariary.format(a.produitPrixUnitaire)}</td>
                    <td className="text-right tabular-nums">{ariary.format(a.produitQuantite * a.produitPrixUnitaire)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* conditions_et_totaux */}
        <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_350px]">
          <Section icone={ClipboardList} titre="Conditions / note">
            <Textarea
              aria-label={t("Conditions / note")}
              value={saisie.conditions}
              maxLength={500}
              placeholder={t("Paiement sous 30 jours.\nMerci pour votre confiance.")}
              onChange={(e) => modifier({ conditions: e.target.value })}
              className="h-24 min-h-24 resize-none rounded-sm border-grid-line p-3 text-sm leading-normal md:text-sm"
            />
          </Section>
          <Section icone={Calculator} titre="Récapitulatif">
            <dl className="flex flex-col gap-2 text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-4">
              <div>
                <dt>{t("Sous-total")}</dt>
                <dd className="tabular-nums">{ariary.format(sousTotal)}</dd>
              </div>
              <div className="text-muted-foreground">
                <dt>
                  {t("Remise")} <span className="tabular-nums">({nombre.format(pourcentage)} %)</span>
                </dt>
                <dd className="tabular-nums">{vente.remise ? `− ${ariary.format(vente.remise)}` : ariary.format(0)}</dd>
              </div>
              <div className="items-baseline rounded-[4px] bg-accent p-2.5 font-bold text-primary">
                <dt className="text-[17px]">{t("Total TTC")}</dt>
                <dd className="text-[19px] tabular-nums">{ariary.format(vente.venteMontant)}</dd>
              </div>
            </dl>
            <MontantEnLettres montant={vente.venteMontant} className="text-right" />
          </Section>
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 justify-end gap-4 px-[22px] pt-2 pb-[22px]">
        <DialogClose render={<Button variant="outline" disabled={enregistrement} className="h-11 rounded-sm border-grid-line px-[22px] text-sm font-normal" />}>
          {t("Annuler")}
        </DialogClose>
        <Button onClick={enregistrer} disabled={enregistrement} className="h-11 gap-2.5 rounded-sm px-[22px] text-sm font-semibold">
          {enregistrement ? <Loader2 className="size-[18px] animate-spin" /> : <Save className="size-[18px]" />}
          {t("Enregistrer la facture")}
        </Button>
      </div>
    </div>
  )
}

function Section({ icone: Icone, titre, children }: { icone: LucideIcon; titre: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Icone className="size-5 text-primary" />
        {tr(titre)}
      </h3>
      {children}
    </section>
  )
}
