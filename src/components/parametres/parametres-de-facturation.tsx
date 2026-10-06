import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t, tr, localeIntl } from "@/i18n"
import { MontantEnLettres } from "@/components/donnees/montant-en-lettres"
import { useState } from "react"
import { Box, FileText, Hash, Save, ToggleLeft } from "lucide-react"

import { ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { CLASSE_DE_CHAMP, OptionAInterrupteur, PanneauDeParametres, SectionDeParametres } from "@/components/parametres/elements-de-parametres"
import { apercuDuNumero, FORMATS_DE_NUMERO } from "@/components/parametres/numerotation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AffichageDeFacture, ParametresDeFacturation as Parametres } from "@/types"

type Interrupteurs = { [K in keyof Parametres]: Parametres[K] extends boolean ? K : never }[keyof Parametres]
type ChampTexte = "coordonneesFiscales" | "nif" | "stat" | "rcs" | "adresse" | "telephone" | "email" | "prefixeDeFacture"

const DEVISES = [
  { value: "MGA", label: "Ariary (MGA)" },
]
const AFFICHAGES: { value: AffichageDeFacture; label: string }[] = [
  { value: "a4", label: "Facture A4" },
  { value: "ticket-80mm", label: "Ticket de caisse 80 mm" },
]
const OPTIONS: { cle: Interrupteurs; libelle: string }[] = [
  { cle: "afficherLogo", libelle: "Afficher le logo de l’entreprise" },
  { cle: "afficherAdresse", libelle: "Afficher l’adresse de l’entreprise" },
  { cle: "afficherIdentifiantsFiscaux", libelle: "Afficher le NIF / STAT / RCS" },
  { cle: "afficherTelephoneEtEmail", libelle: "Afficher le téléphone et l’email" },
  { cle: "afficherInformationsClient", libelle: "Afficher les informations client" },
  { cle: "afficherConditionsDePaiement", libelle: "Afficher les conditions de paiement" },
]
const OBLIGATOIRES: ChampTexte[] = ["coordonneesFiscales", "nif", "stat", "rcs", "adresse", "prefixeDeFacture"]

/** Figma : `parametres_facturation` (node 90:460) — formulaire + `apercu_de_la_facture`. */
export function ParametresDeFacturation({
  parametres,
  draft,
  onEnregistrer,
  enregistrement = false,
}: {
  parametres: Parametres
  draft?: LocalDraft
  onEnregistrer: (parametres: Parametres) => void
  enregistrement?: boolean
}) {
  const [brouillon, setBrouillon] = useDraftState(draft, "brouillon", parametres)
  const [prochainNumero, setProchainNumero] = useDraftState(draft, "prochainNumero", String(parametres.prochainNumero))
  const [tentative, setTentative] = useState(false)
  const modifier = (modif: Partial<Parametres>) => setBrouillon((b) => ({ ...b, ...modif }))

  const erreurs: Partial<Record<ChampTexte | "prochainNumero", string>> = {}
  for (const cle of OBLIGATOIRES) if (!brouillon[cle].trim()) erreurs[cle] = "Champ obligatoire."
  if (brouillon.email.trim() && !/^\S+@\S+\.\S+$/.test(brouillon.email.trim())) erreurs.email = "Adresse e-mail invalide."
  if (!/^\d+$/.test(prochainNumero.trim()) || Number(prochainNumero) < 1) erreurs.prochainNumero = "Saisissez un nombre entier positif."
  const erreur = (cle: keyof typeof erreurs) => (tentative ? erreurs[cle] : undefined)

  const enregistrer = () => {
    setTentative(true)
    if (Object.keys(erreurs).length === 0) onEnregistrer({ ...brouillon, prochainNumero: Number(prochainNumero) })
  }

  const champ = (cle: ChampTexte, libelle: string, props: { type?: string; className?: string } = {}) => (
    <ChampDeFormulaire id={`facture-${cle}`} libelle={tr(libelle)} obligatoire={OBLIGATOIRES.includes(cle)} erreur={erreur(cle)} className={props.className}>
      <Input
        id={`facture-${cle}`}
        type={props.type}
        value={brouillon[cle]}
        aria-invalid={!!erreur(cle)}
        onChange={(e) => modifier({ [cle]: e.target.value })}
        className={CLASSE_DE_CHAMP}
      />
    </ChampDeFormulaire>
  )

  return (
    <PanneauDeParametres
      titre={t("Facturation")}
      description={t("Informations légales, numérotation et présentation de vos factures.")}
      action={
        <Button disabled={enregistrement} onClick={enregistrer} className="h-10 gap-2 rounded-sm px-3.5 text-[13px]">
          <Save className="size-3.5" />
          {t("Enregistrer les modifications")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        {/* formulaire_de_facturation */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-sm border border-grid-line">
          <SectionDeParametres entete="bandeau" icone={FileText} titre={t("Informations de l’entreprise sur les factures")} description={t("Raison sociale et coordonnées affichées.")} className="border-b border-grid-line">
            <div className="grid gap-x-2.5 gap-y-2 sm:grid-cols-2">
              {champ("coordonneesFiscales", "Coordonnées fiscales")}
              {champ("nif", "NIF")}
              {champ("stat", "STAT")}
              {champ("rcs", "RCS")}
              {champ("adresse", "Adresse", { className: "sm:col-span-2" })}
              {champ("telephone", "Téléphone", { type: "tel" })}
              {champ("email", "Email", { type: "email" })}
            </div>
          </SectionDeParametres>

          <SectionDeParametres entete="bandeau" icone={Hash} titre={t("Paramètres des factures")} description={t("Numérotation et échéances.")} className="border-b border-grid-line">
            <div className="grid gap-x-2.5 gap-y-2 sm:grid-cols-2">
              <ChampDeFormulaire id="facture-devise" libelle={t("Devise")} obligatoire>
                <SelectAvecIcone id="facture-devise" options={DEVISES} valeur={brouillon.devise} onChange={(devise) => modifier({ devise })} />
              </ChampDeFormulaire>
              {champ("prefixeDeFacture", "Préfixe de facture")}
              <ChampDeFormulaire id="facture-format" libelle={t("Format du numéro de facture")}>
                <SelectAvecIcone id="facture-format" options={FORMATS_DE_NUMERO} valeur={brouillon.formatDuNumeroDeFacture} onChange={(v) => modifier({ formatDuNumeroDeFacture: v })} />
              </ChampDeFormulaire>
              <ChampDeFormulaire id="facture-prochain" libelle={t("Prochain numéro")} obligatoire erreur={erreur("prochainNumero")}>
                <Input id="facture-prochain" inputMode="numeric" value={prochainNumero} aria-invalid={!!erreur("prochainNumero")} onChange={(e) => setProchainNumero(e.target.value)} className={CLASSE_DE_CHAMP} />
              </ChampDeFormulaire>
              <ChampDeFormulaire id="facture-affichage" libelle={t("Affichage sur la facture")} className="sm:col-span-2">
                <SelectAvecIcone id="facture-affichage" options={AFFICHAGES} valeur={brouillon.affichageSurLaFacture} onChange={(v) => modifier({ affichageSurLaFacture: v })} />
              </ChampDeFormulaire>
            </div>
          </SectionDeParametres>

          <SectionDeParametres entete="bandeau" icone={ToggleLeft} titre={t("Affichage sur la facture")} description={t("Choisissez les éléments visibles.")}>
            <div className="grid gap-x-2.5 px-1 sm:grid-cols-2">
              {OPTIONS.map(({ cle, libelle }) => (
                <OptionAInterrupteur key={cle} id={`facture-${cle}`} libelle={tr(libelle)} valeur={brouillon[cle]} onChange={(v) => modifier({ [cle]: v })} />
              ))}
            </div>
          </SectionDeParametres>
        </div>

        <ApercuDeLaFacture parametres={brouillon} numero={apercuDuNumero(brouillon.prefixeDeFacture, brouillon.formatDuNumeroDeFacture, Number(prochainNumero) || 1)} />
      </div>
    </PanneauDeParametres>
  )
}

/** Lignes d'exemple de l'aperçu (Figma : calque `articles`). */
const ARTICLES_D_EXEMPLE = [
  { designation: "Ciment 50 kg", quantite: 10, prix: 35_000 },
  { designation: "Fer 8 mm", quantite: 20, prix: 14_000 },
  { designation: "Peinture 20 L", quantite: 2, prix: 120_000 },
]

/** Figma : calque `apercu_de_la_facture` — suit les réglages en cours de saisie. */
function ApercuDeLaFacture({ parametres: p, numero }: { parametres: Parametres; numero: string }) {
  const nombre = new Intl.NumberFormat("fr-FR")
  const total = ARTICLES_D_EXEMPLE.reduce((s, a) => s + a.quantite * a.prix, 0)
  const ticket = p.affichageSurLaFacture === "ticket-80mm"

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 xl:w-[360px] 2xl:w-[390px]">
      <h3 className="text-[13px] font-bold">{t("Aperçu de la facture")}</h3>
      <div className={ticket ? "mx-auto w-full max-w-[300px]" : undefined}>
        <div className="flex flex-col gap-2.5 rounded-sm border border-grid-line bg-card p-4 text-[10px] text-foreground/80">
          <div className="flex items-start justify-between gap-3">
            {p.afficherLogo ? (
              <div className="flex flex-col items-center gap-[3px]">
                <Box className="size-9 text-caution" />
                <span className="max-w-[110px] truncate text-[10px] font-bold text-primary uppercase">{p.coordonneesFiscales || t("Votre entreprise")}</span>
              </div>
            ) : (
              <span />
            )}
            <div className="flex w-[190px] flex-col gap-[3px]">
              <span className="text-[11px] font-bold text-foreground">{p.coordonneesFiscales || t("Raison sociale")}</span>
              {p.afficherAdresse && p.adresse && <span>{p.adresse}</span>}
              {p.afficherTelephoneEtEmail && (p.telephone || p.email) && <span>{[p.telephone, p.email].filter(Boolean).join(" · ")}</span>}
              {p.afficherIdentifiantsFiscaux && <span>{t("NIF")} {p.nif || "—"} {t("· STAT")} {p.stat || "—"} {t("· RCS")} {p.rcs || "—"}</span>}
            </div>
          </div>
          <p className="text-xl font-bold text-foreground">{t("FACTURE")}</p>
          <div className="flex items-start justify-between">
            {p.afficherInformationsClient ? (
              <div className="flex flex-col gap-[3px]">
                <span className="text-[9px] text-muted-foreground">{t("CLIENT")}</span>
                <span className="text-[11px] font-semibold text-foreground">{t("Client comptant")}</span>
                <span>{t("Antananarivo")}</span>
              </div>
            ) : (
              <span />
            )}
            <div className="flex flex-col items-end gap-[3px]">
              <span className="text-[11px] font-bold text-foreground">{numero}</span>
              <span>{new Date().toLocaleDateString(localeIntl())}</span>
            </div>
          </div>
          <table className="w-full overflow-hidden rounded-[4px] text-[9px] outline outline-grid-line">
            <thead className="bg-accent font-bold">
              <tr className="[&>th]:px-2 [&>th]:py-1.5">
                <th className="text-left">{t("Désignation")}</th>
                <th className="text-right">{t("Qté")}</th>
                <th className="text-right">{t("Prix unitaire")}</th>
                <th className="text-right">{t("Total")}</th>
              </tr>
            </thead>
            <tbody>
              {ARTICLES_D_EXEMPLE.map((a) => (
                <tr key={a.designation} className="border-t border-grid-line [&>td]:px-2 [&>td]:py-1.5">
                  <td>{a.designation}</td>
                  <td className="text-right tabular-nums">{a.quantite}</td>
                  <td className="text-right tabular-nums">{nombre.format(a.prix)}</td>
                  <td className="text-right tabular-nums">{nombre.format(a.quantite * a.prix)}</td>
                </tr>
              ))}
              <tr className="border-t border-grid-line bg-accent font-bold [&>td]:px-2 [&>td]:py-1.5">
                <td colSpan={3}>{t("Total (")}{p.devise})</td>
                <td className="text-right tabular-nums">{nombre.format(total)}</td>
              </tr>
            </tbody>
          </table>
          <MontantEnLettres montant={total} prefixe={t("Arrêtée la présente facture à la somme de :")} className="text-[9px] text-foreground/80" />
          <p className="text-center text-[9px] text-muted-foreground">
            {t("Merci pour votre confiance !")}
            {p.afficherConditionsDePaiement && (
              <>
                <br />
                {t("Tout retard de paiement peut entraîner des pénalités.")}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
