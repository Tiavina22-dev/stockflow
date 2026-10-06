import type { LucideIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Store } from "@/types"
import { tr } from "@/i18n"

type StoreSelectProps = {
  stores: Store[]
  /** Identifiant du magasin choisi */
  value: string | null
  onValueChange?: (storeId: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  "aria-invalid"?: boolean
  "aria-label"?: string
  /** Icône facultative à gauche de la valeur */
  icone?: LucideIcon
  className?: string
}

/** Select de magasin du kit : bordure bleue à l’ouverture, options de 44 px. Hauteur réglable via className. */
export function StoreSelect({
  stores,
  value,
  onValueChange,
  placeholder = "Choisir un magasin",
  disabled,
  id,
  icone: Icone,
  className,
  ...aria
}: StoreSelectProps) {
  return (
    <Select
      items={stores.map((store) => ({ value: store.id, label: store.name }))}
      value={value}
      onValueChange={(v) => v && onValueChange?.(v as string)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        {...aria}
        className={cn(
          "h-[52px] w-full rounded-lg bg-card px-4 text-sm data-[size=default]:h-[52px] data-popup-open:border-primary data-disabled:bg-muted data-disabled:text-muted-foreground disabled:opacity-100 [&_svg]:size-3.5 data-popup-open:[&_svg]:text-primary",
          className
        )}
      >
        {Icone && <Icone className="size-[19px]! text-foreground" />}
        <SelectValue placeholder={tr(placeholder)} />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        sideOffset={6}
        className="rounded-lg p-0 shadow-card ring-1 ring-border"
      >
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id} className="h-11 rounded-none px-4 text-sm">
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
