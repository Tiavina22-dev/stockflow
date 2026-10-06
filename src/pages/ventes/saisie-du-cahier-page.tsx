import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useState } from "react"
import { ChevronRight } from "lucide-react"

import { SaisieDuCahierFormulaire } from "@/components/cahier/saisie-du-cahier"
import { useActiveStore } from "@/hooks/useActiveStore"
import { useEnregistrerSaisieDuCahier } from "@/hooks/useCashJournals"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useRechercheProduitsVenteProvisoire } from "@/hooks/useSales"
import { useStores } from "@/hooks/useStores"
import { notify } from "@/lib/notify"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import { t } from "@/i18n"

/** Figma : `saisie_du_cahier` (node 228:5372) — recopie rapide du cahier de vente papier. */
export function SaisieDuCahierPage() {
  const { data: magasins } = useStores()
  const { data: utilisateur } = useCurrentUser()
  const [magasinActif, choisirMagasin] = useActiveStore()
  const draft = useFormDraft("cash-journal", magasinActif?.id)
  const [recherche, setRecherche] = useDraftState(draft, "recherche", "")
  const resultats = useRechercheProduitsVenteProvisoire(recherche, magasinActif?.id)
  const enregistrerSaisie = useEnregistrerSaisieDuCahier(draft)
  // Remet le formulaire à zéro après un enregistrement réussi
  const [cleDuFormulaire, setCleDuFormulaire] = useState(0)

  return (
    <CadreApplication pageActive="ventes">
      <main className="flex flex-col gap-5">
        {/* en_tete */}
        <div className="flex flex-col gap-3">
          <nav aria-label={t("Fil d’Ariane")} className="flex items-center gap-3 text-sm text-muted-foreground">
            <a href={lienVersPage("ventes")} className="hover:text-primary hover:underline">
              {t("Ventes")}
            </a>
            <ChevronRight className="size-3.5" />
            <span aria-current="page">{t("Saisie du cahier")}</span>
          </nav>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{t("Saisie du cahier")}</h1>
            <p className="text-sm text-muted-foreground">{t("Recopiez rapidement les lignes du cahier de vente de la journée.")}</p>
          </div>
        </div>

        <SaisieDuCahierFormulaire
          key={`${draft?.key}:${cleDuFormulaire}`}
          draft={draft}
          magasins={magasins ?? []}
          magasinId={magasinActif?.id ?? null}
          onMagasinChange={choisirMagasin}
          utilisateurNom={utilisateur?.name ?? ""}
          recherche={recherche}
          onRechercheChange={setRecherche}
          resultatsRecherche={resultats}
          onEnregistrer={async (saisie) => {
            const { venteNumeros, warnings } = await saveDraftOnServer(draft, () => enregistrerSaisie(saisie))
            const pieces = venteNumeros.length ? ` (${venteNumeros.join(", ")})` : ""
            notify("success", saisie.statut === "validee" ? t("Cahier validé{{v0}}.", { v0: pieces }) : t("Cahier enregistré en brouillon{{v0}}.", { v0: pieces }))
            warnings.forEach((w) => notify("warning", w))
            setRecherche("")
            setCleDuFormulaire((c) => c + 1)
          }}
        />
      </main>
    </CadreApplication>
  )
}
