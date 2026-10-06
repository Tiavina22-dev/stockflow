import { useDeconnexion } from "@/hooks/useSession"
import { t } from "@/i18n"
import { useEffect, useState, type ReactNode } from "react"

import { AppSidebar, type NavKey } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"
import { useActiveStore } from "@/hooks/useActiveStore"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useStores } from "@/hooks/useStores"

const CLE_MENU_REDUIT = "stockflow.menu.reduit"
function lireMenuReduit() {
  try {
    return localStorage.getItem(CLE_MENU_REDUIT) === "1"
  } catch {
    return false
  }
}

export const lienVersPage = (page: NavKey) => `/${page}`
/** Change de page sans recharger (même effet qu'un clic sur un lien interne). */
export function naviguerVers(chemin: string) {
  window.history.pushState(null, "", chemin)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo(0, 0)
}

/**
 * Cadre commun à TOUTES les pages : navigation latérale (AppSidebar) + en-tête (Topbar).
 * Une nouvelle page ne recode jamais ces éléments : elle place son contenu dans ce cadre.
 */
export function CadreApplication({ pageActive, children }: { pageActive: NavKey; children: ReactNode }) {
  const deconnexion = useDeconnexion()
  const [menuReduit, setMenuReduit] = useState(lireMenuReduit)
  // Petit écran : le menu s'ouvre par-dessus la page (fermé à chaque changement de page)
  const [menuOuvertMobile, setMenuOuvertMobile] = useState(false)
  const grandEcran = () => window.matchMedia("(min-width: 768px)").matches
  const basculerMenu = () => {
    if (!grandEcran()) return setMenuOuvertMobile((o) => !o)
    setMenuReduit((r) => {
      try {
        localStorage.setItem(CLE_MENU_REDUIT, r ? "0" : "1")
      } catch {
        /* préférence non mémorisée */
      }
      return !r
    })
  }
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        basculerMenu()
      } else if (e.key === "Escape") setMenuOuvertMobile(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })
  const { data: utilisateur } = useCurrentUser()
  const { data: magasins } = useStores()
  const [magasinActif, choisirMagasin] = useActiveStore()

  return (
    // Collé aux bords de la fenêtre : sidebar pleine hauteur, en-tête en bandeau, contenu défilant
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar
        active={pageActive}
        hrefFor={lienVersPage}
        user={utilisateur}
        onLogout={() => { void deconnexion().catch(() => { /* Local session is cleared even if the backend is unavailable. */ }) }}
        reduit={menuReduit}
        className="hidden h-svh rounded-none md:flex"
      />
      {menuOuvertMobile && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label={t("Fermer le menu")} onClick={() => setMenuOuvertMobile(false)} className="absolute inset-0 bg-foreground/40" />
          <AppSidebar
            active={pageActive}
            hrefFor={lienVersPage}
            user={utilisateur}
            onLogout={() => { void deconnexion().catch(() => {}) }}
            className="relative h-svh rounded-none shadow-card"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar
          onLogout={() => { void deconnexion().catch(() => {}) }}
          firstName={utilisateur?.firstName}
          stores={magasins ?? []}
          activeStoreId={magasinActif?.id}
          onStoreChange={choisirMagasin}
          hasNotifications
          onBasculerMenu={basculerMenu}
          menuReduit={grandEcran() ? menuReduit : !menuOuvertMobile}
          className="sticky top-0 z-10 min-h-24 rounded-none border-0 border-b shadow-none"
        />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}
