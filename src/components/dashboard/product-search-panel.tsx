import { useEffect, useRef } from "react"
import { CircleCheck, Plus, Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

type ProductSearchPanelProps = {
  query: string
  onQueryChange: (query: string) => void
  onOpenFilters?: () => void
  onAddProduct?: () => void
  className?: string
}

export function ProductSearchPanel({
  query,
  onQueryChange,
  onOpenFilters,
  onAddProduct,
  className,
}: ProductSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K place le focus dans la recherche
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <section
      className={cn(
        "flex min-h-[300px] flex-col gap-6 rounded-xl border bg-card p-6 shadow-card",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="product-search" className="text-xs">
            {t("Rechercher un produit")}
          </label>
          <span className="text-[10px] text-muted-foreground">{t("Optionnel")}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[19px] -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="product-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("Nom, SKU ou code-barres")}
            aria-describedby="product-search-hint"
            className="h-[52px] bg-card pr-14 pl-[47px] text-sm md:text-sm"
          />
          <Kbd className="absolute top-1/2 right-4 -translate-y-1/2 rounded-sm border bg-muted px-[7px] text-[10px] font-normal text-muted-foreground">
            ⌘ K
          </Kbd>
        </div>
        <p id="product-search-hint" className="text-[10px] leading-[1.4] text-muted-foreground">
          {t("La recherche s’effectue dans le magasin actif.")}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onOpenFilters}
          className="h-12 flex-1 gap-2 border-input bg-card px-4 text-xs font-normal"
        >
          <SlidersHorizontal className="size-[17px]" />
          {t("Filtres")}
        </Button>
        <Button onClick={onAddProduct} className="h-12 flex-1 gap-2 px-4 text-xs font-bold hover:bg-primary/90">
          <Plus className="size-[18px]" />
          {t("Ajouter un produit")}
        </Button>
      </div>

      <div className="flex items-center gap-2 border-t pt-2 text-[10px] text-muted-foreground">
        <CircleCheck className="size-[15px] text-success" />
        {t("Hauteur de contrôle 48–52 px · rayon 10 px")}
      </div>
    </section>
  )
}
