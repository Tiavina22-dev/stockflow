import type { ReactNode } from "react"
import { Bell, CalendarDays, Check, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Store as StoreIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDateActuelle } from "@/components/layout/use-date-actuelle"
import { cn } from "@/lib/utils"
import type { Store } from "@/types"
import { t } from "@/i18n"

type TopbarProps = {
  /** Absent pendant le chargement */
  firstName?: string
  stores: Store[]
  activeStoreId: string | undefined
  onStoreChange: (storeId: string) => void
  hasNotifications?: boolean
  onLogout?: () => void
  /** Bouton « menu » : réduit / agrandit la navigation latérale */
  onBasculerMenu?: () => void
  /** Menu réduit (ou fermé sur petit écran) : change l'icône et le libellé du bouton */
  menuReduit?: boolean
  className?: string
}

/** En-tête unique de l'application (kit Figma `Navigation/Topbar`). */
export function Topbar({
  firstName,
  stores,
  activeStoreId,
  onStoreChange,
  hasNotifications = false,
  onLogout,
  onBasculerMenu,
  menuReduit = false,
  className,
}: TopbarProps) {
  const { maintenant, dateActuelle, heureActuelle } = useDateActuelle()
  const activeStore = stores.find((store) => store.id === activeStoreId)

  return (
    <header
      className={cn(
        "flex min-h-[132px] flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-6 py-4 shadow-card",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {onBasculerMenu && (
          <Button
            variant="outline"
            onClick={onBasculerMenu}
            aria-label={menuReduit ? t("Afficher le menu") : t("Réduire le menu")}
            aria-expanded={!menuReduit}
            title={`${menuReduit ? t("Afficher le menu") : t("Réduire le menu")} (Ctrl+B)`}
            className="size-12 shrink-0 rounded-lg p-0"
          >
            {menuReduit ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
        )}
      <div className="flex flex-col gap-1">
        <p className="text-xl">
          {t("Bonjour")}{firstName && `, ${firstName}`} <span className="text-lg">👋</span>
        </p>
        <p className="text-xs leading-[1.4] text-muted-foreground">
          {t("Voici l’activité de votre magasin aujourd’hui.")}
        </p>
      </div>
      </div>

      <div className="flex items-center gap-4">
        {onLogout && <Button variant="outline" className="size-12 p-0 md:hidden" aria-label={t("Déconnexion")} onClick={onLogout}><LogOut className="size-5" /></Button>}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={stores.length === 0}
            className="flex h-[52px] w-[286px] items-center gap-3 rounded-lg border border-input bg-card px-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <IconTile>
              <StoreIcon className="size-[18px]" />
            </IconTile>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground">{t("MAGASIN ACTIF")}</span>
              <span className="truncate text-xs">{activeStore?.name ?? t("Chargement…")}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {stores.map((store) => (
              <DropdownMenuItem key={store.id} onClick={() => onStoreChange(store.id)}>
                <span className="flex-1">{store.name}</span>
                {store.id === activeStoreId && <Check className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <IconTile>
            <CalendarDays className="size-[18px]" />
          </IconTile>
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <time className="text-xs" dateTime={maintenant.toISOString()}>
              {dateActuelle}
            </time>
            <span className="text-[10px] text-muted-foreground">{heureActuelle}</span>
          </div>
        </div>

        <Button
          variant="outline"
          aria-label={hasNotifications ? t("Notifications (non lues)") : t("Notifications")}
          className="relative size-12 p-0"
        >
          <Bell className="size-5" />
          {hasNotifications && (
            <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </Button>
      </div>
    </header>
  )
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
      {children}
    </span>
  )
}
