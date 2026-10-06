import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t } from "@/i18n"
import { useState } from "react"
import { BadgeDollarSign, Barcode, FileText, Package, PackageOpen, Save, Settings2, Tag, Tags, TriangleAlert, X } from "lucide-react"

import { PastilleEtat } from "@/components/donnees/pastille-etat"
import { ChampAvecIcone, ChampDeFormulaire, ZoneDeTexteAvecIcone } from "@/components/forms/champ-avec-icone"
import { SelectAvecIcone, type OptionAvecIcone } from "@/components/forms/select-avec-icone"
import { ZoneDePhoto } from "@/components/forms/zone-de-photo"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ProduitSaisi, StatutDeProduit } from "@/types"

export const UNITES_DE_PRODUIT = ["Pièce", "Kg", "g", "L", "cl", "Lot", "Carton"]

const optionsStatut: OptionAvecIcone<StatutDeProduit>[] = [
  { value: "Actif", label: "Actif", rendu: <PastilleEtat libelle={t("Actif")} ton="succes" className="h-auto bg-transparent px-0 text-[13px] font-medium text-foreground" /> },
  { value: "Inactif", label: "Inactif", rendu: <PastilleEtat libelle={t("Inactif")} ton="neutre" className="h-auto bg-transparent px-0 text-[13px] font-medium text-foreground" /> },
]

const vide: ProduitSaisi = {
  nomDuProduit: "",
  reference: "",
  codeBarres: "",
  categorie: "",
  unite: "Pièce",
  prixFournisseur: null,
  prixDeVente: 0,
  seuilDeStockFaible: 5,
  statut: "Actif",
  photo: null,
  description: "",
}

type ProduitFenetreProps = {
  draft?: LocalDraft
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: string[]
  /** Mode modification : produit prérempli */
  produitAModifier?: ProduitSaisi
  seuilParDefaut?: number
  onSoumettre: (produit: ProduitSaisi) => void
}

/** Figma : `nouveau_produit_fenetre` (node 90:4855) — création et modification d'un produit. */
export function ProduitFenetre({ open, onOpenChange, ...props }: ProduitFenetreProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-lg p-0 shadow-card ring-0 sm:max-w-[1080px]"
      >
        {open && <Formulaire key={props.produitAModifier?.produitId ?? "nouveau"} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

type Erreurs = Partial<Record<"nomDuProduit" | "reference" | "categorie" | "prixDeVente" | "prixFournisseur" | "seuil", string>>

function Formulaire({ draft, categories, produitAModifier, onSoumettre, seuilParDefaut }: Omit<ProduitFenetreProps, "open" | "onOpenChange">) {
  const [produit, setProduit] = useDraftState<ProduitSaisi>(draft, "produit", produitAModifier ?? { ...vide, seuilDeStockFaible: seuilParDefaut ?? vide.seuilDeStockFaible })
  const [erreurs, setErreurs] = useState<Erreurs>({})
  // L'erreur d'un champ disparaît dès qu'on le corrige
  const effacerErreur = (cle: keyof Erreurs) => setErreurs((e) => ({ ...e, [cle]: undefined }))
  const modifier = <K extends keyof ProduitSaisi>(champ: K, valeur: ProduitSaisi[K]) => {
    setProduit((p) => ({ ...p, [champ]: valeur }))
    effacerErreur(champ === "seuilDeStockFaible" ? "seuil" : (champ as keyof Erreurs))
  }

  // Les prix sont saisis en texte (virgule française acceptée) et convertis à l'enregistrement
  const enTexte = (n: number | null) => (n === null || n === 0 ? "" : String(n).replace(".", ","))
  const [prixFournisseurTexte, setPrixFournisseurTexte] = useDraftState(draft, "prixFournisseurTexte", enTexte(produit.prixFournisseur))
  const [prixDeVenteTexte, setPrixDeVenteTexte] = useDraftState(draft, "prixDeVenteTexte", enTexte(produit.prixDeVente))
  const lireNombre = (texte: string) => (texte.trim() === "" ? null : Number(texte.trim().replace(/\s/g, "").replace(",", ".")))

  const soumettre = () => {
    const prixFournisseur = lireNombre(prixFournisseurTexte)
    const prixDeVente = lireNombre(prixDeVenteTexte) ?? 0
    const e: Erreurs = {}
    if (!produit.nomDuProduit.trim()) e.nomDuProduit = "Le nom est obligatoire."
    if (!produit.reference.trim()) e.reference = "La référence est obligatoire."
    if (!produit.categorie) e.categorie = "Choisissez une catégorie."
    if (!(prixDeVente > 0)) e.prixDeVente = "Indiquez un prix de vente valide."
    if (prixFournisseur !== null && !(prixFournisseur >= 0)) e.prixFournisseur = "Prix invalide."
    if (!Number.isInteger(produit.seuilDeStockFaible) || produit.seuilDeStockFaible < 0) e.seuil = "Nombre entier positif."
    setErreurs(e)
    if (Object.keys(e).length > 0) return
    onSoumettre({
      ...produit,
      nomDuProduit: produit.nomDuProduit.trim(),
      reference: produit.reference.trim(),
      prixFournisseur,
      prixDeVente,
      description: produit.description.trim(),
    })
  }

  const enModification = produitAModifier !== undefined

  return (
    <div className="flex max-h-[calc(100svh-2rem)] flex-col">
      {/* en_tete_de_la_fenetre */}
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-grid-line pr-5 pl-6">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
            <Package className="size-[25px]" />
          </span>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl font-bold">{enModification ? t("Modifier le produit") : t("Nouveau produit")}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {enModification ? t("Mettez à jour les informations de l’article.") : t("Ajoutez un nouvel article à votre catalogue.")}
            </DialogDescription>
          </div>
        </div>
        <DialogClose render={<Button variant="outline" aria-label={t("Fermer")} className="size-[34px] rounded-sm border-grid-line p-0" />}>
          <X className="size-[18px]" />
        </DialogClose>
      </div>

      {/* formulaire_du_produit */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
        {/* identification */}
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <ChampDeFormulaire id="produit-nom" libelle={t("Nom du produit")} obligatoire erreur={erreurs.nomDuProduit}>
            <ChampAvecIcone
              id="produit-nom"
              icone={Package}
              value={produit.nomDuProduit}
              onChange={(e) => modifier("nomDuProduit", e.target.value)}
              placeholder={t("Ex : Café noir 250g")}
              aria-invalid={!!erreurs.nomDuProduit}
            />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="produit-reference" libelle={t("Référence")} obligatoire erreur={erreurs.reference}>
            <ChampAvecIcone
              id="produit-reference"
              icone={Tag}
              value={produit.reference}
              onChange={(e) => modifier("reference", e.target.value)}
              placeholder={t("Ex : SF-0001")}
              aria-invalid={!!erreurs.reference}
            />
          </ChampDeFormulaire>
        </div>

        {/* classement */}
        <div className="grid gap-4 md:grid-cols-3">
          <ChampDeFormulaire id="produit-code-barres" libelle={t("Code-barres")}>
            <ChampAvecIcone
              id="produit-code-barres"
              icone={Barcode}
              inputMode="numeric"
              value={produit.codeBarres}
              onChange={(e) => modifier("codeBarres", e.target.value)}
              placeholder={t("Ex : 3760000000001")}
            />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="produit-categorie" libelle={t("Catégorie")} obligatoire erreur={erreurs.categorie}>
            <SelectAvecIcone
              id="produit-categorie"
              icone={Tags}
              options={categories.map((c) => ({ value: c, label: c }))}
              valeur={produit.categorie || null}
              onChange={(v) => modifier("categorie", v)}
              placeholder={t("Choisir une catégorie")}
              aria-invalid={!!erreurs.categorie}
            />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="produit-unite" libelle={t("Unité")} obligatoire>
            <SelectAvecIcone
              id="produit-unite"
              icone={PackageOpen}
              options={UNITES_DE_PRODUIT.map((u) => ({ value: u, label: u }))}
              valeur={produit.unite}
              onChange={(v) => modifier("unite", v)}
            />
          </ChampDeFormulaire>
        </div>

        {/* tarification */}
        <div className="grid gap-4 md:grid-cols-3">
          <ChampDeFormulaire id="produit-prix-fournisseur" libelle={t("Prix fournisseur")} erreur={erreurs.prixFournisseur}>
            <ChampAvecIcone
              id="produit-prix-fournisseur"
              icone={BadgeDollarSign}
              suffixe="Ar"
              nombre={{
                valeur: prixFournisseurTexte,
                onChange: (v) => {
                  setPrixFournisseurTexte(v)
                  effacerErreur("prixFournisseur")
                },
              }}
              aria-invalid={!!erreurs.prixFournisseur}
              placeholder="0"
            />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="produit-prix-vente" libelle={t("Prix de vente")} obligatoire erreur={erreurs.prixDeVente}>
            <ChampAvecIcone
              id="produit-prix-vente"
              icone={Tag}
              suffixe="Ar"
              nombre={{
                valeur: prixDeVenteTexte,
                onChange: (v) => {
                  setPrixDeVenteTexte(v)
                  effacerErreur("prixDeVente")
                },
              }}
              placeholder="0"
              aria-invalid={!!erreurs.prixDeVente}
            />
          </ChampDeFormulaire>
          <ChampDeFormulaire id="produit-seuil" libelle={t("Seuil de stock faible")} erreur={erreurs.seuil}>
            <ChampAvecIcone
              id="produit-seuil"
              icone={TriangleAlert}
              nombre={{
                valeur: Number.isFinite(produit.seuilDeStockFaible) ? String(produit.seuilDeStockFaible) : "",
                onChange: (v) => modifier("seuilDeStockFaible", v === "" ? Number.NaN : Number(v)),
              }}
            />
          </ChampDeFormulaire>
        </div>

        {/* disponibilite */}
        <div className="grid gap-4 md:grid-cols-3">
          <ChampDeFormulaire id="produit-statut" libelle={t("Statut")}>
            <SelectAvecIcone
              id="produit-statut"
              icone={Settings2}
              iconeSimple
              options={optionsStatut}
              valeur={produit.statut}
              onChange={(v) => modifier("statut", v)}
            />
          </ChampDeFormulaire>
        </div>

        {/* informations_complementaires */}
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">{t("Photo du produit")}</span>
            <ZoneDePhoto fichier={produit.photo} photoUrl={produit.photoUrl} onChange={(f) => modifier("photo", f)} />
          </div>
          <ChampDeFormulaire id="produit-description" libelle={t("Description / Note")}>
            <ZoneDeTexteAvecIcone
              id="produit-description"
              icone={FileText}
              valeur={produit.description}
              onChange={(v) => modifier("description", v)}
              maximum={500}
              placeholder={t("Ajoutez une description ou des notes sur le produit...")}
            />
          </ChampDeFormulaire>
        </div>
      </div>

      {/* actions_de_la_fenetre */}
      <div className="flex h-[72px] shrink-0 items-center justify-end gap-3 border-t border-grid-line px-6">
        <DialogClose render={<Button variant="outline" className="h-[42px] w-[104px] rounded-sm border-grid-line text-[13px] font-medium" />}>
          {t("Annuler")}
        </DialogClose>
        <Button onClick={soumettre} className="h-[42px] w-[194px] gap-2 rounded-sm text-[13px] font-semibold">
          <Save className="size-4" />
          {t("Enregistrer")}
        </Button>
      </div>
    </div>
  )
}
