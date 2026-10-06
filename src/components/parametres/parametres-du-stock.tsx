import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { Save } from "lucide-react"

import { CLASSE_DE_CHAMP, PanneauDeParametres, ReglageAInterrupteur } from "@/components/parametres/elements-de-parametres"
import { Button } from "@/components/ui/button"
import { ChampNombre } from "@/components/forms/champ-nombre"
import { cn } from "@/lib/utils"
import type { ParametresDuStock as Parametres } from "@/types"
import { t, tr } from "@/i18n"

type Interrupteurs = { [K in keyof Parametres]: Parametres[K] extends boolean ? K : never }[keyof Parametres]

const REGLAGES: { cle: Interrupteurs; titre: string; description: string }[] = [
  { cle: "autoriserStockNegatif", titre: "Autoriser le stock négatif", description: "Permettre les ventes lorsque le stock disponible est insuffisant." },
  { cle: "alerteStockInsuffisant", titre: "Afficher une alerte de stock insuffisant", description: "Avertir lorsqu’un transfert dépasse le stock disponible." },
]
const REGLAGES_SUITE: typeof REGLAGES = [
  { cle: "validationObligatoirePourInventaire", titre: "Validation obligatoire pour inventaire", description: "Demander une validation avant prise en compte d’un inventaire." },
  { cle: "autoriserTransfertsEntreMagasins", titre: "Autoriser les transferts entre magasins", description: "Permettre le transfert de produits d’un magasin vers un autre." },
  { cle: "motifObligatoirePourCorrection", titre: "Motif obligatoire pour correction de stock", description: "Exiger un motif pour toute correction manuelle de stock." },
  { cle: "alerteStockFaible", titre: "Alerte stock faible", description: "Recevoir une alerte lorsque le stock passe en dessous du seuil défini." },
  { cle: "alerteRuptureDeStock", titre: "Alerte rupture de stock", description: "Avertir les utilisateurs lorsque le stock d’un produit est nul." },
]

/** Figma : `parametres_stock` (node 90:4), calque `parametres_du_stock`. */
export function ParametresDuStock({
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
  const [seuil, setSeuil] = useDraftState(draft, "seuil", String(parametres.seuilParDefautDeStockFaible))
  const seuilInvalide = !/^\d+$/.test(seuil.trim())

  const reglage = ({ cle, titre, description }: (typeof REGLAGES)[number]) => (
    <ReglageAInterrupteur
      key={cle}
      id={`stock-${cle}`}
      titre={tr(titre)}
      description={tr(description)}
      valeur={brouillon[cle]}
      onChange={(valeur) => setBrouillon((b) => ({ ...b, [cle]: valeur }))}
      taille="compacte"
    />
  )

  return (
    <PanneauDeParametres
      titre={t("Paramètres du stock")}
      description={t("Définissez les règles de gestion du stock, les seuils et les comportements du système.")}
      action={
        <Button
          disabled={enregistrement || seuilInvalide}
          onClick={() => onEnregistrer({ ...brouillon, seuilParDefautDeStockFaible: Number(seuil) })}
          className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal"
        >
          <Save className="size-3.5" />
          {t("Enregistrer")}
        </Button>
      }
    >
      {/* regles_generales */}
      <div className="flex flex-col rounded-lg px-3.5">
        {REGLAGES.map(reglage)}
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-4 border-b border-grid-line/70 py-2.5">
          <label htmlFor="stock-seuil" className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-semibold">{t("Seuil par défaut de stock faible")}</span>
            <span className="text-[10px] text-muted-foreground">{t("Quantité à partir de laquelle un produit est considéré en stock faible.")}</span>
          </label>
          <div className="flex items-center gap-2">
            <ChampNombre
              id="stock-seuil"
              valeur={seuil}
              aria-invalid={seuilInvalide}
              onChange={setSeuil}
              className={cn(CLASSE_DE_CHAMP, "h-9 w-[130px] bg-background")}
            />
            <span className="text-[11px] text-muted-foreground">{t("unité(s)")}</span>
          </div>
        </div>
        {REGLAGES_SUITE.map(reglage)}
      </div>
    </PanneauDeParametres>
  )
}
