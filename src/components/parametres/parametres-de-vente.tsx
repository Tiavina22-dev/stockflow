import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t, tr } from "@/i18n"
import { Banknote, CalendarDays, Check, CreditCard, Hash, Save, SlidersHorizontal, Smartphone, type LucideIcon } from "lucide-react"

import { ChampDeFormulaire } from "@/components/forms/champ-avec-icone"
import { SelectAvecIcone } from "@/components/forms/select-avec-icone"
import { CLASSE_DE_CHAMP, PanneauDeParametres, ReglageAInterrupteur, SectionDeParametres } from "@/components/parametres/elements-de-parametres"
import { apercuDuNumero, FORMATS_DE_NUMERO } from "@/components/parametres/numerotation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ModeDePaiement, ParametresDeVente as Parametres } from "@/types"

type Interrupteurs = { [K in keyof Parametres]: Parametres[K] extends boolean ? K : never }[keyof Parametres]
type Reglage = { cle: Interrupteurs; titre: string; description: string }

const COMPORTEMENT: [Reglage[], Reglage[]] = [
  [
    { cle: "autoriserBrouillons", titre: "Autoriser les brouillons", description: "Enregistrement sans validation." },
    { cle: "autoriserAnnulation", titre: "Autoriser l’annulation", description: "Annuler une vente validée." },
    { cle: "motifObligatoirePourAnnulation", titre: "Motif obligatoire pour annulation", description: "Saisir un motif lors de l’annulation." },
  ],
  [
    { cle: "imprimerRecuApresValidation", titre: "Imprimer le reçu après validation", description: "Afficher le reçu automatiquement." },
    { cle: "clientObligatoire", titre: "Client obligatoire", description: "Un client doit être sélectionné." },
    { cle: "autoriserModificationApresValidation", titre: "Autoriser la modification après validation", description: "Modifier une vente déjà validée." },
  ],
]

const MODES: { value: ModeDePaiement; titre: string; description: string; icone: LucideIcon }[] = [
  { value: "especes", titre: "Espèces", description: "Paiement en espèces accepté.", icone: Banknote },
  { value: "mobile-money", titre: "Mobile Money", description: "MVola, Orange Money, Airtel Money.", icone: Smartphone },
  { value: "bancaire", titre: "Bancaire", description: "Paiement bancaire accepté.", icone: CreditCard },
]

const VENTES_PAR_PAGE = [10, 20, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} ventes` }))

/** Figma : `parametres_ventes` (node 90:225), calque `panneau_principal`. */
export function ParametresDeVente({
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
  const modifier = (modif: Partial<Parametres>) => setBrouillon((b) => ({ ...b, ...modif }))

  const numeroInvalide = !/^\d+$/.test(prochainNumero.trim()) || Number(prochainNumero) < 1
  const erreurPaiement = brouillon.modesDePaiement.length === 0 ? "Choisissez au moins un mode de paiement." : undefined

  const basculerMode = (mode: ModeDePaiement) =>
    modifier({
      modesDePaiement: brouillon.modesDePaiement.includes(mode)
        ? brouillon.modesDePaiement.filter((m) => m !== mode)
        : [...brouillon.modesDePaiement, mode],
    })

  const reglage = ({ cle, titre, description }: Reglage) => (
    <ReglageAInterrupteur key={cle} id={`vente-${cle}`} titre={tr(titre)} description={tr(description)} valeur={brouillon[cle]} onChange={(v) => modifier({ [cle]: v })} />
  )

  return (
    <PanneauDeParametres
      titre={t("Paramètres de vente")}
      description={t("Configurez le comportement et les règles lors de la création de vos ventes.")}
      action={
        <Button
          disabled={enregistrement || numeroInvalide || !!erreurPaiement}
          onClick={() => onEnregistrer({ ...brouillon, prochainNumero: Number(prochainNumero) })}
          className="h-10 gap-2 rounded-sm px-3.5 text-[13px]"
        >
          <Save className="size-3.5" />
          {t("Enregistrer les modifications")}
        </Button>
      }
    >
      <SectionDeParametres icone={Hash} titre={t("Paramètres de numérotation")} description={t("Définissez le format des numéros de vente générés automatiquement.")}>
        <div className="grid gap-3 md:grid-cols-3">
          <ChampDeFormulaire id="vente-prefixe" libelle={t("Préfixe numéro de vente")}>
            <Input id="vente-prefixe" value={brouillon.prefixeNumeroDeVente} maxLength={8} onChange={(e) => modifier({ prefixeNumeroDeVente: e.target.value.toUpperCase() })} className={CLASSE_DE_CHAMP} />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="vente-format" libelle={t("Format de numéro de vente")}>
            <SelectAvecIcone id="vente-format" options={FORMATS_DE_NUMERO} valeur={brouillon.formatDeNumeroDeVente} onChange={(v) => modifier({ formatDeNumeroDeVente: v })} />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="vente-prochain" libelle={t("Prochain numéro")} erreur={numeroInvalide ? "Saisissez un nombre entier positif." : undefined}>
            <Input id="vente-prochain" inputMode="numeric" value={prochainNumero} aria-invalid={numeroInvalide} onChange={(e) => setProchainNumero(e.target.value)} className={CLASSE_DE_CHAMP} />
          </ChampDeFormulaire>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("Aperçu :")} <span className="font-semibold text-foreground">{apercuDuNumero(brouillon.prefixeNumeroDeVente, brouillon.formatDeNumeroDeVente, numeroInvalide ? 1 : Number(prochainNumero))}</span>
        </p>
      </SectionDeParametres>

      <SectionDeParametres icone={SlidersHorizontal} titre={t("Comportement des ventes")} description={t("Règles de saisie lors de la création et de la validation des ventes.")}>
        <div className="grid gap-x-6 md:grid-cols-2">
          {COMPORTEMENT.map((colonne, i) => (
            <div key={i} className="flex flex-col">
              {colonne.map(reglage)}
            </div>
          ))}
        </div>
      </SectionDeParametres>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionDeParametres icone={CreditCard} titre={t("Modes de paiement")} description={t("Moyens de paiement disponibles.")} className="self-start">
          <div role="group" aria-label={t("Modes de paiement acceptés")} className="grid gap-2 sm:grid-cols-3">
            {MODES.map(({ value, titre, description, icone: Icone }) => {
              const choisi = brouillon.modesDePaiement.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={choisi}
                  onClick={() => basculerMode(value)}
                  className={cn(
                    "relative flex flex-col items-start gap-1.5 rounded-sm border bg-background p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    choisi ? "border-2 border-primary p-[11px]" : "border-grid-line hover:border-primary/50"
                  )}
                >
                  <Icone className={cn("size-5", choisi ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[13px] font-semibold">{tr(titre)}</span>
                  <span className="text-[11px] text-muted-foreground">{tr(description)}</span>
                  {choisi && (
                    <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {erreurPaiement && <p className="text-xs text-destructive">{erreurPaiement}</p>}
        </SectionDeParametres>

        <SectionDeParametres icone={CalendarDays} titre={t("Cahier de vente")} description={t("Paramètres liés au cahier de vente.")}>
          <div className="flex flex-col">
            {reglage({ cle: "afficherHeuresDansLeCahier", titre: "Afficher les heures dans le cahier", description: "Heure exacte pour chaque vente." })}
            {reglage({ cle: "afficherVentesAnnulees", titre: "Afficher les ventes annulées", description: "Inclure les annulées dans le cahier." })}
          </div>
          <ChampDeFormulaire id="vente-par-page" libelle={t("Nombre de ventes par page")}>
            <SelectAvecIcone
              id="vente-par-page"
              options={VENTES_PAR_PAGE}
              valeur={String(brouillon.nombreDeVentesParPage)}
              onChange={(v) => modifier({ nombreDeVentesParPage: Number(v) })}
            />
          </ChampDeFormulaire>
        </SectionDeParametres>
      </div>
    </PanneauDeParametres>
  )
}
