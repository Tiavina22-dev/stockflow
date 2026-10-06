import { Fragment, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Construction } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import type { NavKey } from "@/components/layout/app-sidebar"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { useSession } from "@/hooks/useSession"
import { t } from "@/i18n"
import { ReinitialisationPage } from "@/pages/connexion/reinitialisation-page"
import { AccueilPage } from "@/pages/accueil/accueil-page"
import { AdvancedKitPage } from "@/pages/advanced-kit-page"
import { CadreApplication, lienVersPage } from "@/pages/cadre-application"
import { ConnexionPage } from "@/pages/connexion/connexion-page"
import { HistoriquePage } from "@/pages/historique/historique-page"
import { ParametresPage, rubriqueDepuisRoute } from "@/pages/parametres/parametres-page"
import { DetailDuProduitPage, detailDuProduitDepuisRoute } from "@/pages/produits/detail-du-produit-page"
import { ProduitsPage } from "@/pages/produits/produits-page"
import { ongletDepuisRoute, RapportsPage } from "@/pages/rapports/rapports-page"
import { FacturesFournisseursPage } from "@/pages/stock/factures-fournisseurs-page"
import { StockPage } from "@/pages/stock/stock-page"
import { UtilisateursPage } from "@/pages/utilisateurs/utilisateurs-page"
import { DepensesVersementsPage } from "@/pages/ventes/depenses-versements-page"
import { SaisieDuCahierPage } from "@/pages/ventes/saisie-du-cahier-page"
import { CahierDeVentePage } from "@/pages/ventes/cahier-de-vente-page"
import { VentesPage } from "@/pages/ventes/ventes-page"

export default function App() {
  const route = usePathRoute()
  const session = useSession()
  const publicRoute = route === "/connexion" || route === "/reinitialisation"
  // Changer de langue réaffiche toute l'interface (les textes sont traduits au rendu)
  const { i18n } = useTranslation()
  useEffect(() => {
    if (!session.enChargement && !session.connecte && !publicRoute) {
      window.history.replaceState(null, "", "/connexion")
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }, [session.enChargement, session.connecte, publicRoute])

  return (
    <>
      <Fragment key={i18n.language}>
        {publicRoute ? <Page route={route} /> : session.enChargement ? <p role="status" className="p-6 text-sm">{t("Vérification de la session…")}</p> : session.connecte ? <Page route={route} /> : <ConnexionPage />}
      </Fragment>
      <Toaster position="bottom-right" />
    </>
  )
}

const pages: NavKey[] = [
  "accueil", "ventes", "stock", "produits",
  "rapports", "historique", "utilisateurs", "reglages",
]

function Page({ route }: { route: string }) {
  // Vitrine du kit Figma « composants avancés » (référence de design)
  if (route === "/connexion") return <ConnexionPage />
  if (route === "/reinitialisation") return <ReinitialisationPage />
  if (route === "/kit-avance") return <AdvancedKitPage />
  const detailDuProduit = detailDuProduitDepuisRoute(route)
  if (detailDuProduit) return <DetailDuProduitPage key={detailDuProduit.id} {...detailDuProduit} />
  if (route === "/stock/factures-fournisseurs") return <FacturesFournisseursPage />
  if (route === "/ventes/depenses-versements") return <DepensesVersementsPage />
  if (route === "/ventes/cahier/saisie") return <SaisieDuCahierPage />
  if (route === "/ventes/cahier") return <CahierDeVentePage />
  if (route === "/reglages" || route.startsWith("/reglages/")) return <ParametresPage rubrique={rubriqueDepuisRoute(route)} />
  if (route === "/rapports" || route.startsWith("/rapports/")) return <RapportsPage onglet={ongletDepuisRoute(route)} />

  const page = route.replace("/", "") as NavKey
  if (page === "accueil") return <AccueilPage />
  if (page === "ventes") return <VentesPage />
  if (page === "produits") return <ProduitsPage />
  if (page === "utilisateurs") return <UtilisateursPage />
  if (page === "historique") return <HistoriquePage />
  if (page === "stock" || !pages.includes(page)) return <StockPage />
  return <PageAVenir page={page} />
}

function PageAVenir({ page }: { page: NavKey }) {
  return (
    <CadreApplication pageActive={page}>
      <main>
        <EmptyState
          icon={Construction}
          title="Écran à venir"
          description="Cet écran n’a pas encore été reproduit depuis Figma."
          action={
            <Button size="xl" className="w-full text-xs" render={<a href={lienVersPage("stock")} />}>
              Retour au stock
            </Button>
          }
          className="bg-card"
        />
      </main>
    </CadreApplication>
  )
}

function usePathRoute() {
  const [route, setRoute] = useState(() => {
    // Les anciens favoris restent utilisables apr?s le changement d'adresses.
    if (window.location.hash.startsWith("#/")) {
      window.history.replaceState(null, "", window.location.hash.slice(1))
    }
    return window.location.pathname
  })
  useEffect(() => {
    const onChange = () => setRoute(window.location.pathname)
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest("a") : null
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return
      const url = new URL(anchor.href)
      if (url.origin !== window.location.origin || url.hash || !anchor.getAttribute("href")?.startsWith("/")) return
      event.preventDefault()
      window.history.pushState(null, "", url.pathname + url.search)
      onChange()
      window.scrollTo(0, 0)
    }
    window.addEventListener("popstate", onChange)
    document.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("popstate", onChange)
      document.removeEventListener("click", onClick)
    }
  }, [])
  return route
}
