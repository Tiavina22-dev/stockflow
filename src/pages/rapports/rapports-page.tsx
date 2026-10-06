import { t, tr } from "@/i18n"
import { useState, type ReactNode } from "react"
import { ArrowRight, BadgeCheck, Boxes, ChartColumn, PackageCheck, TriangleAlert } from "lucide-react"

import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { EnTeteDeRapport, ONGLETS_DE_RAPPORT } from "@/components/rapports/en-tete-de-rapport"
import { Button } from "@/components/ui/button"
import { useActiveStore } from "@/hooks/useActiveStore"
import { useStores } from "@/hooks/useStores"
import { notify } from "@/lib/notify"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import {
  exporterRapportProvisoire,
  useRapportDesPrixProvisoire,
  useRapportDesProduitsProvisoire,
  useRapportDesVentesProvisoire,
  useRapportDuStockProvisoire,
} from "@/hooks/useReports"
import { RapportPrix } from "@/pages/rapports/rapport-prix"
import { RapportProduits } from "@/pages/rapports/rapport-produits"
import { RapportStock } from "@/pages/rapports/rapport-stock"
import { RapportVentes } from "@/pages/rapports/rapport-ventes"
import type { AsyncState, FiltresDeRapport, FormatDExport, IndicateurDeRapport, OngletDeRapport, PeriodeDeRapport } from "@/types"

export const lienOngletDeRapport = (onglet: OngletDeRapport) => (onglet === "vue-generale" ? "/rapports" : `/rapports/${onglet}`)

/** Onglet actif d'après l'adresse (`/rapports/ventes`…). */
export function ongletDepuisRoute(route: string): OngletDeRapport {
  const onglet = route.replace("/rapports", "").replace("/", "")
  return ONGLETS_DE_RAPPORT.some((o) => o.value === onglet) ? (onglet as OngletDeRapport) : "vue-generale"
}

/** Figma : `rapports_ventes`, `rapports_stock`, `rapports_produits`, `rapports_prix_ecarts`. */
export function RapportsPage({ onglet }: { onglet: OngletDeRapport }) {
  const { data: magasins } = useStores()
  const [magasinActif, choisirMagasin] = useActiveStore()
  const [periode, setPeriode] = useState<PeriodeDeRapport>("30-jours")
  const [produitSuiviId, setProduitSuiviId] = useState("p1")
  const filtres: FiltresDeRapport = { storeId: magasinActif?.id, periode }

  const ventes = useRapportDesVentesProvisoire(filtres)
  const stock = useRapportDuStockProvisoire(filtres)
  const produits = useRapportDesProduitsProvisoire(filtres, produitSuiviId)
  const prix = useRapportDesPrixProvisoire(filtres)

  const exporter = async (format: FormatDExport) => {
    try {
      await exporterRapportProvisoire(onglet, format, filtres, produitSuiviId)
      const nom = ONGLETS_DE_RAPPORT.find((o) => o.value === onglet)?.label
      notify("success", t("Export {{v0}} du rapport « {{v1}} » lancé.", { v0: format.toUpperCase(), v1: nom }))
    } catch (erreur) {
      notify("error", erreur instanceof Error ? erreur.message : t("L’export a échoué."))
    }
  }

  return (
    <CadreApplication pageActive="rapports">
      <main className="flex flex-col gap-4">
        <EnTeteDeRapport
          onglet={onglet}
          lienOnglet={lienOngletDeRapport}
          magasins={magasins ?? []}
          magasinId={magasinActif?.id}
          onMagasinChange={choisirMagasin}
          periode={periode}
          onPeriodeChange={setPeriode}
          onExporter={exporter}
        />

        {onglet === "vue-generale" && (
          <VueGenerale
            sections={[
              { onglet: "ventes", icone: ChartColumn, indicateurs: ventes.data && [ventes.data.chiffreDAffaires, ventes.data.nombreDeVentes, ventes.data.panierMoyen, ventes.data.ventesValidees] },
              { onglet: "stock", icone: Boxes, indicateurs: stock.data && [stock.data.stockTotal, stock.data.stockEntrant, stock.data.valeurDuStock, stock.data.rotationMoyenne] },
              { onglet: "produits", icone: PackageCheck, indicateurs: produits.data && [produits.data.produitsVendus, produits.data.nouveauxProduits, produits.data.produitsActifs, produits.data.margeMoyenne] },
              { onglet: "prix-ecarts", icone: TriangleAlert, indicateurs: prix.data && [prix.data.ecartsDetectes, prix.data.produitsConcernes, prix.data.montantImpacte, prix.data.modificationsDePrix] },
            ]}
          />
        )}
        {onglet === "ventes" && <Contenu etat={ventes}>{(r) => <RapportVentes rapport={r} />}</Contenu>}
        {onglet === "stock" && <Contenu etat={stock}>{(r) => <RapportStock rapport={r} />}</Contenu>}
        {onglet === "produits" && (
          <Contenu etat={produits}>
            {(r) => <RapportProduits rapport={r} produitSuiviId={produitSuiviId} onProduitSuiviChange={setProduitSuiviId} />}
          </Contenu>
        )}
        {onglet === "prix-ecarts" && <Contenu etat={prix}>{(r) => <RapportPrix rapport={r} lienHistorique={lienVersPage("historique")} />}</Contenu>}
      </main>
    </CadreApplication>
  )
}

/** Chargement / erreur communs à chaque rapport. */
function Contenu<T>({ etat, children }: { etat: AsyncState<T>; children: (rapport: T) => ReactNode }) {
  if (etat.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">{t("Chargement du rapport…")}</p>
  if (etat.error || !etat.data)
    return (
      <p role="alert" className="py-16 text-center text-sm text-destructive">
        {tr(etat.error) ?? t("Rapport indisponible.")}
      </p>
    )
  return <>{children(etat.data)}</>
}

type SectionDeVueGenerale = {
  onglet: OngletDeRapport
  icone: typeof ChartColumn
  /** Indicateurs du rapport (absents pendant le chargement) */
  indicateurs: IndicateurDeRapport[] | undefined
}

/** Vue générale (pas de maquette Figma) : les indicateurs de chaque rapport + lien vers le détail. */
function VueGenerale({ sections }: { sections: SectionDeVueGenerale[] }) {
  const tons = ["info", "succes", "alerte", "violet"] as const
  return (
    <div className="flex flex-col gap-6">
      {sections.map((s) => {
        const libelle = ONGLETS_DE_RAPPORT.find((o) => o.value === s.onglet)?.label
        return (
          <section key={s.onglet} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <s.icone className="size-[18px] text-primary" />
                {tr(libelle)}
              </h2>
              <Button variant="link" render={<a href={lienOngletDeRapport(s.onglet)} />} className="h-auto gap-1 p-0 text-xs font-semibold">
                {t("Voir le rapport")}
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {s.indicateurs?.map((indicateur, i) => (
                  <IndicateurCle
                    key={indicateur.libelle}
                    ton={tons[i]}
                    icone={i === 3 ? BadgeCheck : s.icone}
                    libelle={tr(indicateur.libelle)}
                    valeur={indicateur.valeur}
                    detail={indicateur.evolution}
                    tendance={indicateur.tendance}
                  />
                ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
