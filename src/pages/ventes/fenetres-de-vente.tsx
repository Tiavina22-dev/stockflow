import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState } from "react"
import { usePreferences } from "@/hooks/usePreferences"
import { t } from "@/i18n"

import { DetailDeLaVenteFenetre } from "@/components/ventes/detail-de-la-vente-fenetre"
import { NouvelleVenteFenetre } from "@/components/ventes/nouvelle-vente-fenetre"
import { notify } from "@/lib/notify"
import {
  enregistrerVenteProvisoire,
  useDetailDeVenteProvisoire,
  useRechercheProduitsVenteProvisoire,
} from "@/hooks/useSales"
import type { DetailDeVente, NouvelleVente, Store } from "@/types"

/**
 * Fenêtres partagées par la liste des ventes et le cahier de vente :
 * Nouvelle vente, Détail de la vente, Modifier la vente.
 */
export function useFenetresDeVente(magasins: Store[], magasinActif: Store | undefined) {
  const preferences = usePreferences()
  const uiDraft = useFormDraft("sale-ui", magasinActif?.id)
  // Détail de la vente
  const [venteConsultee, setVenteConsultee] = useState<{ id: string; numero: string } | null>(null)
  const detail = useDetailDeVenteProvisoire(venteConsultee?.id ?? null, magasinActif)

  // Nouvelle vente / modification
  const [formulaireOuvert, setFormulaireOuvert] = useDraftState(uiDraft, "formulaireOuvert", false)
  const [venteAModifier, setVenteAModifier] = useDraftState<DetailDeVente | undefined>(uiDraft, "venteAModifier", undefined)
  const [rechercheProduit, setRechercheProduit] = useDraftState(uiDraft, "rechercheProduit", "")
  const draft = useFormDraft("sale", venteAModifier?.magasinId ?? magasinActif?.id, venteAModifier?.id)
  const resultatsRecherche = useRechercheProduitsVenteProvisoire(rechercheProduit, venteAModifier?.magasinId ?? magasinActif?.id)

  const ouvrirFormulaire = (vente?: DetailDeVente) => {
    setVenteConsultee(null)
    setVenteAModifier(vente)
    setRechercheProduit("")
    setFormulaireOuvert(true)
  }

  const soumettre = async (vente: NouvelleVente) => {
    try {
      const { venteNumero, venteId, warnings } = await saveDraftOnServer(draft, key => enregistrerVenteProvisoire(vente, key), vente)
      setFormulaireOuvert(false)
      setRechercheProduit("")
      for (const message of warnings) notify("warning", message)
      if (vente.statut === "validee" && preferences.data?.ventes.imprimerRecuApresValidation) setVenteConsultee({ id: venteId, numero: venteNumero })
      const numero = venteAModifier?.venteNumero ?? venteNumero
      notify(
        "success",
        venteAModifier
          ? t("Vente {{v0}} modifiée.", { v0: numero })
          : vente.statut === "validee"
            ? t("Vente {{v0}} validée.", { v0: numero })
            : t("Vente {{v0}} enregistrée (en attente).", { v0: numero })
      )
    } catch (erreur) {
      notify("error", erreur instanceof Error ? erreur.message : t("L’enregistrement de la vente a échoué."))
    }
  }

  const fenetres = (
    <>
      <DetailDeLaVenteFenetre
        open={venteConsultee !== null}
        onOpenChange={(ouvert) => !ouvert && setVenteConsultee(null)}
        venteNumero={venteConsultee?.numero}
        detail={detail}
        onModifier={ouvrirFormulaire}
      />
      <NouvelleVenteFenetre
        key={draft?.key}
        draft={draft}
        venteAModifier={venteAModifier}
        open={formulaireOuvert}
        onOpenChange={setFormulaireOuvert}
        magasins={magasins}
        magasinParDefautId={magasinActif?.id}
        recherche={rechercheProduit}
        onRechercheChange={setRechercheProduit}
        resultatsRecherche={resultatsRecherche}
        onScanner={() => notify("warning", t("Scan de code-barres : à venir."))}
        onSoumettre={soumettre}
      />
    </>
  )

  return {
    /** Ouvre « Nouvelle vente » */
    nouvelleVente: () => ouvrirFormulaire(),
    /** Ouvre « Détail de la vente » */
    consulter: (id: string, numero: string) => setVenteConsultee({ id, numero }),
    /** Ouvre directement « Modifier la vente » (détail chargé par la logique) */
    modifier: (vente: DetailDeVente) => ouvrirFormulaire(vente),
    /** À placer une fois dans la page */
    fenetres,
  }
}
