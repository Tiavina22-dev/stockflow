import { t, tr } from "@/i18n"
import type { ReactElement } from "react"
import {
  BarChart3,
  Boxes,
  LogOut,
  History,
  House,
  Package,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react"

import { SymboleStockFlow } from "@/components/layout/logo-stockflow"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Pages de l'application (une entrée de menu = une page). */
export type NavKey =
  | "accueil"
  | "ventes"
  | "stock"
  | "produits"
  | "rapports"
  | "historique"
  | "utilisateurs"
  | "reglages"

type NavItem = { key: NavKey; label: string; icon: LucideIcon }

const pilotage: NavItem[] = [
  { key: "accueil", label: "Accueil", icon: House },
  { key: "ventes", label: "Ventes", icon: ShoppingCart },
  { key: "stock", label: "Stock", icon: Boxes },
  { key: "produits", label: "Produits", icon: Package },
]

const operations: NavItem[] = [
  { key: "rapports", label: "Rapports", icon: BarChart3 },
  { key: "historique", label: "Historique", icon: History },
  { key: "utilisateurs", label: "Utilisateurs", icon: Users },
]

type AppSidebarProps = {
  active: NavKey
  /** Lien de chaque page, ex. `(key) => "/" + key` */
  hrefFor: (key: NavKey) => string
  /** Absent pendant le chargement */
  user?: { name: string; role: string; initials: string }
  onLogout?: () => void
  /** Menu réduit à une barre d'icônes (libellés en info-bulle) */
  reduit?: boolean
  className?: string
}

/** Navigation latérale unique de l'application (kit Figma `Navigation/Sidebar`). */
export function AppSidebar({ active, hrefFor, user, onLogout, reduit = false, className }: AppSidebarProps) {
  return (
    <TooltipProvider>
      <aside
        data-reduit={reduit || undefined}
        className={cn(
          "flex shrink-0 flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-xl bg-sidebar pt-6 pb-4 text-sidebar-foreground transition-[width,padding] duration-200",
          reduit ? "w-[76px] px-[14px]" : "w-[280px] px-4",
          className
        )}
      >
        <div className={cn("flex items-center gap-3 pb-4", reduit ? "justify-center" : "px-2")}>
          <SymboleStockFlow titre={reduit ? t("StockFlow") : undefined} className="size-[42px]" />
          <div className={cn("flex min-w-0 flex-col gap-0.5", reduit && "sr-only")}>
            <p className="text-base font-bold text-white">{t("StockFlow")}</p>
            <p className="text-xs">{t("Gestion magasin")}</p>
          </div>
        </div>

        <NavSection title={t("Pilotage")} items={pilotage} active={active} hrefFor={hrefFor} reduit={reduit} />
        <Separator className="bg-sidebar-border" />
        <NavSection title={t("Opérations")} items={operations} active={active} hrefFor={hrefFor} reduit={reduit} />

        <div className="flex-1" />

        <div className="flex flex-col gap-2">
          {user && (
            <div className={cn("flex items-center gap-3 rounded-lg bg-sidebar-accent p-2", reduit && "flex-col gap-1.5 px-0 py-2")} title={reduit ? `${user.name} · ${tr(user.role)}` : undefined}>
              <Avatar className="size-[38px] after:hidden">
                <AvatarFallback className="bg-accent text-xs text-primary">{user.initials}</AvatarFallback>
              </Avatar>
              <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", reduit && "sr-only")}>
                <p className="truncate text-xs text-white">{user.name}</p>
                <p className="truncate text-[10px]">{tr(user.role)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("Déconnexion")}
                title={t("Déconnexion")}
                onClick={onLogout}
                className="text-sidebar-foreground hover:bg-white/10 hover:text-white"
              >
                <LogOut />
              </Button>
            </div>
          )}
          <AvecInfoBulle reduit={reduit} libelle={t("Paramètres")}>
            <a
              href={hrefFor("reglages")}
              aria-current={active === "reglages" ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-xs transition-colors outline-none hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                reduit && "h-12 justify-center px-0",
                active === "reglages" && "bg-sidebar-primary text-sidebar-primary-foreground"
              )}
            >
              <Settings className="size-[18px] shrink-0" />
              <span className={cn(reduit && "sr-only")}>{t("Paramètres")}</span>
            </a>
          </AvecInfoBulle>
        </div>
      </aside>
    </TooltipProvider>
  )
}

/** Menu réduit : le libellé s'affiche en info-bulle à droite de l'icône. */
function AvecInfoBulle({ reduit, libelle, children }: { reduit: boolean; libelle: string; children: ReactElement }) {
  if (!reduit) return children
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" sideOffset={10}>
        {libelle}
      </TooltipContent>
    </Tooltip>
  )
}

type NavSectionProps = {
  title: string
  items: NavItem[]
  active: NavKey
  hrefFor: (key: NavKey) => string
  reduit: boolean
}

function NavSection({ title, items, active, hrefFor, reduit }: NavSectionProps) {
  return (
    <nav className="flex flex-col gap-1" aria-label={tr(title)}>
      <p className={cn("text-[10px] font-bold uppercase", reduit && "sr-only")}>{tr(title)}</p>
      {items.map(({ key, label, icon: Icon }) => {
        const isActive = key === active
        return (
          <AvecInfoBulle key={key} reduit={reduit} libelle={tr(label)}>
            <a
              href={hrefFor(key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-[52px] w-full items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                reduit && "h-12 justify-center px-0",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className={cn("flex-1", reduit && "sr-only")}>{tr(label)}</span>
              {isActive && !reduit && <span className="h-5 w-1 rounded-full bg-white" />}
            </a>
          </AvecInfoBulle>
        )
      })}
    </nav>
  )
}
