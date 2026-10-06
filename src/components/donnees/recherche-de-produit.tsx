import { t, tr } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { forwardRef, useId, useState, type ReactNode } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ProduitRecherche } from "@/types"

type RechercheDeProduitProps = {
  recherche: string
  onRechercheChange: (recherche: string) => void
  /** Résultats correspondant à `recherche` (fournis par la page / la logique) */
  resultats: ProduitRecherche[]
  onChoisir: (produit: ProduitRecherche) => void
  placeholder?: string
  /** Taille du champ : 44 px (fenêtres d'opération) ou 48 px (nouvelle vente) */
  taille?: "normale" | "grande"
  /** Élément affiché à droite du champ (ex. bouton de scan) */
  accessoireDroite?: ReactNode
  className?: string
}

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : calque `recherche_de_produit` + liste de résultats (combobox). */
export const RechercheDeProduit = forwardRef<HTMLInputElement, RechercheDeProduitProps>(
  function RechercheDeProduit(
    {
      recherche,
      onRechercheChange,
      resultats,
      onChoisir,
      placeholder = "Produit, référence ou code-barres",
      taille = "normale",
      accessoireDroite,
      className,
    },
    ref
  ) {
    const grande = taille === "grande"
    const idListe = useId()
    const [actif, setActif] = useState(0)
    const [ouvert, setOuvert] = useState(false)
    const visible = ouvert && recherche.trim().length > 0

    const choisir = (produit: ProduitRecherche) => {
      onChoisir(produit)
      onRechercheChange("")
      setActif(0)
    }

    return (
      <div className={cn("relative", className)}>
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2",
            grande ? "left-3.5 size-5" : "left-3 size-4"
          )}
        />
        <Input
          ref={ref}
          role="combobox"
          aria-expanded={visible}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-label={t("Rechercher un produit à ajouter")}
          value={recherche}
          onChange={(e) => {
            onRechercheChange(e.target.value)
            setActif(0)
            setOuvert(true)
          }}
          onFocus={() => setOuvert(true)}
          onBlur={() => setTimeout(() => setOuvert(false), 120)}
          onKeyDown={(e) => {
            if (!visible || resultats.length === 0) return
            if (e.key === "ArrowDown") setActif((i) => (i + 1) % resultats.length)
            else if (e.key === "ArrowUp") setActif((i) => (i - 1 + resultats.length) % resultats.length)
            else if (e.key === "Enter") choisir(resultats[actif])
            else if (e.key === "Escape") setOuvert(false)
            else return
            e.preventDefault()
          }}
          placeholder={tr(placeholder)}
          className={cn(
            "rounded-sm border-grid-line",
            grande ? "h-12 pl-11 text-sm md:text-sm" : "h-11 pl-[38px] text-[13px] md:text-[13px]",
            accessoireDroite && "pr-12"
          )}
        />
        {accessoireDroite && <div className="absolute top-1/2 right-2 -translate-y-1/2">{accessoireDroite}</div>}
        {visible && (
          <ul
            id={idListe}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-sm border bg-popover p-1 shadow-card"
          >
            {resultats.length === 0 && (
              <li className="px-3 py-2.5 text-[13px] text-muted-foreground">{t("Aucun produit trouvé.")}</li>
            )}
            {resultats.map((produit, index) => (
              <li
                key={produit.id}
                role="option"
                aria-selected={index === actif}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActif(index)}
                onClick={() => choisir(produit)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-[13px]",
                  index === actif && "bg-accent"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{produit.produitNom}</span>
                  <span className="block text-[11px] text-muted-foreground">{produit.reference}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end text-[11px] text-muted-foreground">
                  {produit.prixUnitaire !== undefined && (
                    <span className="text-[13px] font-semibold text-foreground">{ariary.format(produit.prixUnitaire)}</span>
                  )}
                  {produit.stockDisponible !== undefined && <span>{t("Stock :")} {nombre.format(produit.stockDisponible)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
)
