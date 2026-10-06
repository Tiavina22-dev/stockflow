import { t } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { useState } from "react"
import { Banknote, ChartNoAxesCombined, Package, ShoppingCart, TriangleAlert, Trophy } from "lucide-react"

import { CarteAvecTitre, SelecteurDePeriode } from "@/components/donnees/carte-avec-titre"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { CourbeDesVentes } from "@/components/tableau-de-bord/courbe-des-ventes"
import { DernieresActivites } from "@/components/tableau-de-bord/dernieres-activites"
import { ProduitsLesPlusVendus } from "@/components/tableau-de-bord/produits-les-plus-vendus"
import { useActiveStore } from "@/hooks/useActiveStore"
import {
  useDernieresActivitesProvisoires,
  useEvolutionDesVentesProvisoire,
  useProduitsLesPlusVendusProvisoire,
  useResumeDuTableauDeBordProvisoire,
} from "@/hooks/useReports"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import type { PeriodeDuTableauDeBord } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")

const periodes: { value: PeriodeDuTableauDeBord; label: string }[] = [
  { value: "7-jours", label: "7 derniers jours" },
  { value: "30-jours", label: "30 derniers jours" },
  { value: "12-mois", label: "12 derniers mois" },
]

/** Figma : frame `tableau_de_bord_de_gestion_de_stock` (node 90:3732). */
export function AccueilPage() {
  const [magasinActif] = useActiveStore()
  const [periodeVentes, setPeriodeVentes] = useState<PeriodeDuTableauDeBord>("7-jours")
  const [periodeProduits, setPeriodeProduits] = useState<PeriodeDuTableauDeBord>("7-jours")

  const resume = useResumeDuTableauDeBordProvisoire(magasinActif?.id)
  const evolution = useEvolutionDesVentesProvisoire(magasinActif?.id, periodeVentes)
  const classement = useProduitsLesPlusVendusProvisoire(magasinActif?.id, periodeProduits)
  const activites = useDernieresActivitesProvisoires(magasinActif?.id)

  return (
    <CadreApplication pageActive="accueil">
      <main className="flex flex-col gap-4">
        {/* indicateurs_cles */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <IndicateurCle
            ton="info"
            icone={ShoppingCart}
            libelle={t("Ventes des 7 derniers jours")}
            valeur={resume.data ? nombre.format(resume.data.ventesDes7DerniersJours) : ""}
            detail={resume.data?.ventesEvolution ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="succes"
            icone={Banknote}
            libelle={t("Chiffre d’affaires mensuel")}
            valeur={resume.data ? ariary.format(resume.data.chiffreDAffairesMensuel) : ""}
            detail={resume.data?.chiffreDAffairesEvolution ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="alerte"
            icone={Package}
            libelle={t("Produits en stock faible")}
            valeur={resume.data ? nombre.format(resume.data.produitsEnStockFaible) : ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="danger"
            icone={TriangleAlert}
            libelle={t("Ruptures de stock")}
            valeur={resume.data ? nombre.format(resume.data.rupturesDeStock) : ""}
            enChargement={resume.isLoading}
          />
        </div>

        {/* analyses */}
        <div className="grid gap-4 xl:grid-cols-[760fr_584fr]">
          <CarteAvecTitre
            icone={ChartNoAxesCombined}
            titre={t("Évolution des ventes")}
            action={
              <SelecteurDePeriode aria-label={t("Période de l’évolution des ventes")} options={periodes} valeur={periodeVentes} onChange={setPeriodeVentes} />
            }
          >
            {evolution.error ? (
              <p role="alert" className="py-16 text-center text-sm text-destructive">{evolution.error}</p>
            ) : (
              <CourbeDesVentes points={evolution.data ?? []} className={evolution.isLoading ? "opacity-50" : undefined} />
            )}
          </CarteAvecTitre>
          <CarteAvecTitre
            icone={Trophy}
            titre={t("Produits les plus vendus")}
            action={
              <SelecteurDePeriode aria-label={t("Période du classement")} options={periodes} valeur={periodeProduits} onChange={setPeriodeProduits} />
            }
          >
            <ProduitsLesPlusVendus produits={classement.data ?? []} />
          </CarteAvecTitre>
        </div>

        {/* dernieres_activites */}
        <DernieresActivites
          activites={activites.data ?? []}
          lienVoirTout={lienVersPage("historique")}
          enChargement={activites.isLoading}
          erreur={activites.error}
        />
      </main>
    </CadreApplication>
  )
}
