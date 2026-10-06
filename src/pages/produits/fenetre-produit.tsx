import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { usePreferences } from "@/hooks/usePreferences"
import { t } from "@/i18n"

import { ProduitFenetre } from "@/components/produits/produit-fenetre"
import { notify } from "@/lib/notify"
import { enregistrerProduitProvisoire, produitSaisiProvisoire } from "@/hooks/useCatalog"
import type { ProduitSaisi } from "@/types"

/** Fenêtre produit partagée (page Produits, action « Modifier » du Stock…). */
export function useFenetreProduit(categories: string[]) {
  const preferences = usePreferences()
  const uiDraft = useFormDraft("product-ui")
  const [ouverte, setOuverte] = useDraftState(uiDraft, "ouverte", false)
  const [produitAModifier, setProduitAModifier] = useDraftState<ProduitSaisi | undefined>(uiDraft, "produitAModifier", undefined)

  const draft = useFormDraft("product", undefined, produitAModifier?.produitId)
  const ouvrir = (produit?: ProduitSaisi) => {
    setProduitAModifier(produit)
    setOuverte(true)
  }

  const soumettre = async (produit: ProduitSaisi) => {
    try {
      await saveDraftOnServer(draft, () => enregistrerProduitProvisoire(produit))
      setOuverte(false)
      notify("success", produit.produitId ? t("« {{v0}} » mis à jour.", { v0: produit.nomDuProduit }) : t("« {{v0}} » ajouté au catalogue.", { v0: produit.nomDuProduit }))
    } catch (erreur) {
      notify("error", erreur instanceof Error ? erreur.message : t("L’enregistrement du produit a échoué."))
    }
  }

  return {
    nouveauProduit: () => ouvrir(),
    /** Ouvre la fenêtre en modification à partir de l'identifiant du produit */
    modifierProduit: async (produitId: string) => {
      try {
      const produit = await produitSaisiProvisoire(produitId)
      if (produit) ouvrir(produit)
      else notify("error", t("Produit introuvable."))
      } catch (error) { notify("error", error instanceof Error ? error.message : t("Erreur API.")) }
    },
    fenetre: (
      <ProduitFenetre
        key={draft?.key}
        draft={draft}
        open={ouverte}
        onOpenChange={setOuverte}
        categories={categories}
        seuilParDefaut={preferences.data?.stock.seuilParDefautDeStockFaible}
        produitAModifier={produitAModifier}
        onSoumettre={soumettre}
      />
    ),
  }
}
