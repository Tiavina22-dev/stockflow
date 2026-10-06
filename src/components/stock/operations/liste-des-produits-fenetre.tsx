import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useMemo } from "react"
import { ListChecks, Package, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/i18n"
import { cn } from "@/lib/utils"
import type { ProduitRecherche } from "@/types"

const nombre = new Intl.NumberFormat("fr-FR")
const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

type ListeDesProduitsFenetreProps = {
  draft?: LocalDraft
  ouverte: boolean
  onOuvertureChange: (ouverte: boolean) => void
  /** Tous les produits du magasin */
  produits: ProduitRecherche[]
  enChargement?: boolean
  /** Produits déjà dans l'opération (cochés et grisés) */
  dejaAjoutes: string[]
  onAjouter: (produits: ProduitRecherche[]) => void
}

/** Fenêtre « Liste » de l'opération de stock : cocher plusieurs produits d'un coup. */
export function ListeDesProduitsFenetre({ ouverte, onOuvertureChange, ...props }: ListeDesProduitsFenetreProps) {
  return (
    <Dialog open={ouverte} onOpenChange={onOuvertureChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-lg border border-grid-line p-0 shadow-card ring-0 sm:max-w-[640px]"
      >
        {ouverte && <Contenu {...props} onFermer={() => onOuvertureChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenu({ draft, produits, enChargement = false, dejaAjoutes, onAjouter, onFermer }: Omit<ListeDesProduitsFenetreProps, "ouverte" | "onOuvertureChange"> & { onFermer: () => void }) {
  const [recherche, setRecherche] = useDraftState(draft, "listeRecherche", "")
  const [choisis, setChoisis] = useDraftState<Set<string>>(draft, "listeChoisis", new Set())
  const deja = new Set(dejaAjoutes)

  const visibles = useMemo(() => {
    const r = normaliser(recherche.trim())
    return r ? produits.filter((p) => normaliser(`${p.produitNom} ${p.reference} ${p.detail ?? ""}`).includes(r)) : produits
  }, [produits, recherche])
  const selectionnables = visibles.filter((p) => !deja.has(p.id))
  const toutCoche = selectionnables.length > 0 && selectionnables.every((p) => choisis.has(p.id))
  const enPartie = !toutCoche && selectionnables.some((p) => choisis.has(p.id))

  const basculer = (id: string) =>
    setChoisis((c) => {
      const s = new Set(c)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  const basculerTout = () =>
    setChoisis((c) => {
      const s = new Set(c)
      selectionnables.forEach((p) => (toutCoche ? s.delete(p.id) : s.add(p.id)))
      return s
    })

  return (
    <div className="flex max-h-[calc(100svh-2rem)] flex-col">
      {/* en_tete */}
      <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-grid-line px-[18px] py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <ListChecks className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl leading-tight font-bold">{t("Liste des produits")}</DialogTitle>
            <DialogDescription className="text-[13px]">{t("Cochez les produits à ajouter : leur quantité sera à saisir ensuite.")}</DialogDescription>
          </div>
        </div>
        <DialogClose render={<Button variant="outline" aria-label={t("Fermer")} className="size-[34px] shrink-0 rounded-sm border-grid-line p-0" />}>
          <X className="size-[18px]" />
        </DialogClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-[18px] py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            autoFocus
            aria-label={t("Filtrer les produits")}
            placeholder={t("Filtrer par nom, référence ou catégorie…")}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="h-12 rounded-sm border-grid-line pl-11 text-sm md:text-sm"
          />
        </div>

        {/* liste */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-muted-foreground/25">
          <div className="sticky top-0 z-10 flex h-10 items-center gap-3 border-b border-muted-foreground/25 bg-background px-3 text-[11px] font-bold text-muted-foreground uppercase">
            <Checkbox
              aria-label={t("Tout sélectionner")}
              checked={toutCoche}
              indeterminate={enPartie}
              disabled={selectionnables.length === 0}
              onCheckedChange={basculerTout}
            />
            <span className="flex-1 text-center">{t("Produit")}</span>
            <span className="w-[110px] text-center">{t("Catégorie")}</span>
            <span className="w-[70px] text-center">{t("Stock")}</span>
          </div>
          {enChargement ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t("Chargement…")}</p>
          ) : visibles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("Aucun produit trouvé.")}</p>
          ) : (
            visibles.map((p) => {
              const estDeja = deja.has(p.id)
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex min-h-12 items-center gap-3 border-b border-muted-foreground/15 px-3 last:border-b-0",
                    estDeja ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/50",
                    choisis.has(p.id) && "bg-accent/60"
                  )}
                >
                  <Checkbox checked={estDeja || choisis.has(p.id)} disabled={estDeja} onCheckedChange={() => basculer(p.id)} aria-label={p.produitNom} />
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="size-8 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground">
                      <Package className="size-4" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold">{p.produitNom}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {p.reference}
                      {estDeja && ` · ${t("déjà dans l’opération")}`}
                    </span>
                  </span>
                  <span className="w-[110px] truncate text-center text-xs text-muted-foreground">{p.detail ?? "—"}</span>
                  <span className="w-[70px] text-right text-xs tabular-nums">{p.stockDisponible === undefined ? "—" : nombre.format(p.stockDisponible)}</span>
                </label>
              )
            })
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-t border-grid-line px-[18px]">
        <span className="text-[13px] text-muted-foreground" aria-live="polite">
          {t("{{v0}} produit(s) sélectionné(s)", { v0: choisis.size })}
        </span>
        <div className="flex gap-3">
          <DialogClose render={<Button variant="outline" className="h-[42px] w-[104px] rounded-sm border-grid-line text-[13px] font-medium" />}>{t("Annuler")}</DialogClose>
          <Button
            disabled={choisis.size === 0}
            onClick={() => {
              onAjouter(produits.filter((p) => choisis.has(p.id)))
              onFermer()
            }}
            className="h-[42px] min-w-[150px] rounded-sm text-[13px] font-semibold"
          >
            {t("Ajouter ({{v0}})", { v0: choisis.size })}
          </Button>
        </div>
      </div>
    </div>
  )
}
