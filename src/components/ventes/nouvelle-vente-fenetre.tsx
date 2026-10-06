import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t, tr } from "@/i18n"
import { MontantEnLettres } from "@/components/donnees/montant-en-lettres"
import { ariary } from "@/components/donnees/montants"
import { useRef, useState } from "react"
import { Check, File, Package, ScanBarcode, ShoppingCart, Store as StoreIcon, Trash2, X } from "lucide-react"

import { RechercheDeProduit } from "@/components/donnees/recherche-de-produit"
import { ChampDate, dateDuJour } from "@/components/forms/champ-date"
import { SelecteurDeQuantite } from "@/components/forms/selecteur-de-quantite"
import { StoreSelect } from "@/components/forms/store-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ChampNombre } from "@/components/forms/champ-nombre"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { DetailDeVente, LigneDeNouvelleVente, NouvelleVente, ProduitRecherche, Store } from "@/types"


type NouvelleVenteFenetreProps = {
  draft?: LocalDraft
  open: boolean
  onOpenChange: (open: boolean) => void
  magasins: Store[]
  magasinParDefautId?: string
  recherche: string
  onRechercheChange: (recherche: string) => void
  resultatsRecherche: ProduitRecherche[]
  /** Scan de code-barres (facultatif) */
  onScanner?: () => void
  /** Mode « Modifier la vente » : formulaire prérempli avec cette vente */
  venteAModifier?: DetailDeVente
  onSoumettre: (vente: NouvelleVente) => void
}

/** Figma : `nouvelle_vente_fenetre` (node 90:3598). */
export function NouvelleVenteFenetre({ open, onOpenChange, ...props }: NouvelleVenteFenetreProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-2xl border border-grid-line p-0 shadow-card ring-0 sm:max-w-[1240px]"
      >
        {/* Monté seulement quand la fenêtre est ouverte : formulaire vierge à chaque ouverture */}
        {open && <Formulaire key={props.venteAModifier?.id ?? "nouvelle"} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulaire({ draft,
  magasins,
  magasinParDefautId,
  recherche,
  onRechercheChange,
  resultatsRecherche,
  onScanner,
  venteAModifier,
  onSoumettre,
}: Omit<NouvelleVenteFenetreProps, "open" | "onOpenChange">) {
  const rechercheRef = useRef<HTMLInputElement>(null)
  const [magasinId, setMagasinId] = useDraftState<string | null>(draft, "magasinId", venteAModifier?.magasinId ?? magasinParDefautId ?? null)
  const [venteDate, setVenteDate] = useDraftState(draft, "venteDate", () => venteAModifier ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Indian/Antananarivo" }).format(new Date(venteAModifier.venteDate)) : dateDuJour())
  const [lignes, setLignes] = useDraftState<LigneDeNouvelleVente[]>(draft, "lignes",
    () =>
      venteAModifier?.articles.map((a) => ({
        produitId: a.produitId,
        produitNom: a.produitNom,
        produitDetail: `Réf. ${a.produitReference}`,
        photoUrl: a.photoUrl,
        quantite: a.produitQuantite,
        prixUnitaire: a.produitPrixUnitaire,
      })) ?? []
  )
  const [remise, setRemise] = useDraftState(draft, "remise", venteAModifier?.remise ?? 0)
  const [note, setNote] = useDraftState(draft, "note", venteAModifier?.note ?? "")
  const [erreur, setErreur] = useState<string | null>(null)

  // Affichage des totaux (le montant enregistré fait foi côté logique)
  const sousTotal = lignes.reduce((somme, l) => somme + l.quantite * l.prixUnitaire, 0)
  const total = Math.max(0, sousTotal - remise)

  const ajouterProduit = (produit: ProduitRecherche) => {
    setErreur(null)
    setLignes((actuelles) =>
      actuelles.some((l) => l.produitId === produit.id)
        ? actuelles.map((l) => (l.produitId === produit.id ? { ...l, quantite: l.quantite + 1 } : l))
        : [
            ...actuelles,
            {
              produitId: produit.id,
              produitNom: produit.produitNom,
              produitDetail: produit.detail ?? produit.reference,
              photoUrl: produit.photoUrl,
              quantite: 1,
              prixUnitaire: produit.prixUnitaire ?? 0,
            },
          ]
    )
  }

  const soumettre = (statut: NouvelleVente["statut"]) => {
    if (!magasinId) return setErreur(t("Choisissez un magasin."))
    if (lignes.length === 0) return setErreur(t("Ajoutez au moins un produit."))
    if (remise > sousTotal) return setErreur(t("La remise ne peut pas dépasser le sous-total."))
    onSoumettre({ venteId: venteAModifier?.id, magasinId, venteDate, lignes, remise, note: note.trim(), statut })
  }

  return (
    <div className="flex max-h-[calc(100svh-2rem)] min-h-[min(820px,calc(100svh-2rem))] flex-col">
      {/* en_tete_du_formulaire */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-grid-line px-6">
        <div className="flex items-center gap-[15px]">
          <div className="flex size-[42px] items-center justify-center rounded-sm bg-accent text-primary">
            <ShoppingCart className="size-[23px]" />
          </div>
          <DialogTitle className="text-[22px] font-bold">
            {venteAModifier ? t("Modifier la vente {{v0}}", { v0: venteAModifier.venteNumero }) : t("Nouvelle vente")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("Ajoutez des produits, vérifiez le total puis validez la vente.")}</DialogDescription>
        </div>
        <DialogClose
          render={<Button variant="outline" aria-label={t("Fermer")} className="size-8 rounded-sm border-grid-line p-0" />}
        >
          <X className="size-5" />
        </DialogClose>
      </div>

      {/* champs_principaux */}
      <div className="flex shrink-0 flex-col gap-3 px-6 pt-4 pb-3">
        <div className="grid gap-4 md:grid-cols-[574fr_592fr]">
          <StoreSelect
            icone={StoreIcon}
            aria-label={t("Magasin de la vente")}
            stores={magasins}
            value={magasinId}
            onValueChange={setMagasinId}
            className="h-12 gap-2.5 rounded-sm border-grid-line px-3 text-[13px] font-medium data-[size=default]:h-12"
          />
          <ChampDate aria-label={t("Date de la vente")} valeur={venteDate} max={dateDuJour()} onChange={setVenteDate} />
        </div>
        <RechercheDeProduit
          ref={rechercheRef}
          taille="grande"
          placeholder={t("Rechercher un produit, référence ou code-barres")}
          recherche={recherche}
          onRechercheChange={onRechercheChange}
          resultats={resultatsRecherche}
          onChoisir={ajouterProduit}
          accessoireDroite={
            <Button variant="ghost" size="icon" aria-label={t("Scanner un code-barres")} onClick={onScanner}>
              <ScanBarcode className="size-[21px]" />
            </Button>
          }
        />
      </div>

      {/* produits_selectionnes */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        <div className="sticky top-0 z-10 grid h-11 shrink-0 grid-cols-[1fr_210px_150px_150px_90px] items-center rounded-t-sm bg-background px-4 text-[10px] font-bold text-muted-foreground uppercase">
          <span>{t("Produit")}</span>
          <span className="text-center">{t("Qté")}</span>
          <span className="text-right">{t("Prix unitaire")}</span>
          <span className="text-right">{t("Total")}</span>
          <span className="text-right">{t("Action")}</span>
        </div>
        {lignes.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <ShoppingCart className="size-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{t("Aucun produit dans la vente")}</p>
            <Button variant="link" onClick={() => rechercheRef.current?.focus()} className="text-[13px]">
              {t("Rechercher un produit à ajouter")}
            </Button>
          </div>
        )}
        {lignes.map((ligne) => (
          <div
            key={ligne.produitId}
            className="grid h-[76px] shrink-0 grid-cols-[1fr_210px_150px_150px_90px] items-center border-t border-border px-4"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              {ligne.photoUrl ? (
                <img src={ligne.photoUrl} alt="" className="size-[52px] shrink-0 rounded-sm object-cover" />
              ) : (
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground">
                  <Package className="size-6" />
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-semibold">{ligne.produitNom}</p>
                {ligne.produitDetail && <p className="truncate text-[11px] text-muted-foreground">{ligne.produitDetail}</p>}
              </div>
            </div>
            <SelecteurDeQuantite
              className="justify-center"
              nom={ligne.produitNom}
              valeur={ligne.quantite}
              onChange={(quantite) =>
                setLignes((actuelles) => actuelles.map((l) => (l.produitId === ligne.produitId ? { ...l, quantite } : l)))
              }
            />
            <span className="text-right text-[13px] font-medium tabular-nums">{ariary.format(ligne.prixUnitaire)}</span>
            <span className="text-right text-[13px] font-semibold tabular-nums">
              {ariary.format(ligne.prixUnitaire * ligne.quantite)}
            </span>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                aria-label={t("Retirer {{v0}}", { v0: ligne.produitNom })}
                onClick={() => setLignes((actuelles) => actuelles.filter((l) => l.produitId !== ligne.produitId))}
                className="size-[34px] rounded-sm bg-danger-muted p-0 text-destructive hover:bg-destructive hover:text-white"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* recapitulatif */}
      <div className="grid shrink-0 gap-5 border-t border-border px-6 py-4 md:grid-cols-[560fr_450fr] md:justify-between">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note-de-vente" className="text-[13px] font-semibold">
            {t("Note de vente")}
          </label>
          <Textarea
            id="note-de-vente"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("Ajouter une note facultative...")}
            className="h-[74px] min-h-[74px] rounded-sm border-grid-line p-2.5 text-xs md:text-xs"
          />
        </div>
        <div className="flex flex-col gap-2.5 md:max-w-[450px]">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">{t("Sous-total :")}</span>
            <span className="font-semibold tabular-nums">{ariary.format(sousTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <label htmlFor="remise" className="text-muted-foreground">
              {t("Remise :")}
            </label>
            <div className="relative w-[210px]">
              <ChampNombre
                id="remise"
                valeur={remise === 0 ? "" : String(remise)}
                placeholder="0"
                onChange={(v) => setRemise(v === "" ? 0 : Number(v))}
                className="h-9 rounded-sm border-grid-line pr-8 text-right text-xs md:text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{t("Ar")}</span>
            </div>
          </div>
          <div className="flex h-[52px] items-center justify-between rounded-sm bg-accent px-3.5 font-bold">
            <span className="text-base">{t("Total :")}</span>
            <span className={cn("text-[22px] text-primary tabular-nums")}>{ariary.format(total)}</span>
          </div>
          <MontantEnLettres montant={total} className="text-right" />
        </div>
      </div>

      {/* actions_du_formulaire */}
      <div className="flex min-h-[92px] shrink-0 flex-wrap items-center justify-end gap-3 border-t border-grid-line px-6 py-3">
        {erreur && (
          <p role="alert" className="mr-auto text-[13px] text-destructive">
            {tr(erreur)}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => soumettre("brouillon")}
          className="h-10 w-[208px] gap-2 rounded-sm border-grid-line text-[13px] font-semibold text-primary"
        >
          <File className="size-[17px]" />
          {t("Enregistrer")}
        </Button>
        <Button onClick={() => soumettre("validee")} className="h-10 w-[186px] gap-2 rounded-sm text-[13px] font-semibold">
          <Check className="size-[17px]" />
          {t("Valider")}
        </Button>
      </div>
    </div>
  )
}
