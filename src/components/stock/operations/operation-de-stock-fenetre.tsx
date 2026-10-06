import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useRef, useState, type ReactNode } from "react"
import { ListChecks, Plus, Trash2, X } from "lucide-react"

import { ChampNombre } from "@/components/forms/champ-nombre"
import { StoreSelect } from "@/components/forms/store-select"
import { RechercheDeProduit } from "@/components/donnees/recherche-de-produit"
import { ListeDesProduitsFenetre } from "@/components/stock/operations/liste-des-produits-fenetre"
import { TYPES_D_OPERATION } from "@/components/stock/operations/types-d-operation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type {
  LigneOperationDeStock,
  OperationDeStock,
  ProduitRecherche,
  Store,
  TypeOperationDeStock,
} from "@/types"
import { t, tr } from "@/i18n"

type OperationDeStockFenetreProps = {
  draft?: LocalDraft
  /** Type d'opération affiché ; `null` = fenêtre fermée */
  type: TypeOperationDeStock | null
  onFermer: () => void
  magasins: Store[]
  /** Magasin présélectionné (magasin actif) */
  magasinParDefautId?: string
  /** Lignes présélectionnées (ex. « Transférer » depuis la liste du stock) */
  lignesInitiales?: LigneOperationDeStock[]
  recherche: string
  onRechercheChange: (recherche: string) => void
  resultatsRecherche: ProduitRecherche[]
  /** Tous les produits du magasin, pour la fenêtre « Liste » */
  tousLesProduits?: ProduitRecherche[]
  tousLesProduitsEnChargement?: boolean
  /** « Enregistrer » (brouillon) ou « Valider » */
  onSoumettre: (operation: OperationDeStock) => void
}

/**
 * Figma : entree_de_stock_fenetre, sortie_retrait_fenetre, retour_client_fenetre,
 * transfert_entre_magasins_fenetre, correction_inventaire_fenetre — une seule fenêtre configurée par type.
 */
export function OperationDeStockFenetre({ type, onFermer, ...props }: OperationDeStockFenetreProps) {
  return (
    <Dialog open={type !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-lg border border-grid-line p-0 shadow-card ring-0 sm:max-w-[520px]"
      >
        {/* La clé réinitialise le formulaire à chaque ouverture / changement de type */}
        {type && <Formulaire key={type} type={type} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

type Erreurs = Partial<Record<"magasin" | "destination" | "lignes", string>>

function Formulaire({ draft,
  type,
  magasins,
  magasinParDefautId,
  lignesInitiales = [],
  recherche,
  onRechercheChange,
  resultatsRecherche,
  tousLesProduits = [],
  tousLesProduitsEnChargement = false,
  onSoumettre,
}: Omit<OperationDeStockFenetreProps, "type" | "onFermer"> & { type: TypeOperationDeStock }) {
  const config = TYPES_D_OPERATION[type]
  const estTransfert = type === "transfert"
  const rechercheRef = useRef<HTMLInputElement>(null)

  const [magasinId, setMagasinId] = useDraftState<string | null>(draft, "magasinId", magasinParDefautId ?? null)
  const [destinationId, setDestinationId] = useDraftState<string | null>(draft, "destinationId", null)
  const [lignes, setLignes] = useDraftState<LigneOperationDeStock[]>(draft, "lignes", lignesInitiales)
  const [note, setNote] = useDraftState(draft, "note", "")
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [listeOuverte, setListeOuverte] = useDraftState(draft, "listeOuverte", false)
  // Après « Valider » : les quantités manquantes sont signalées ligne par ligne
  const [verifierQuantites, setVerifierQuantites] = useState(false)
  const quantiteMinimale = type === "correction" ? 0 : 1
  const quantiteInvalide = (l: LigneOperationDeStock) => !Number.isFinite(l.quantite) || l.quantite < quantiteMinimale

  const ajouterProduit = (produit: ProduitRecherche) => {
    setLignes((actuelles) =>
      actuelles.some((l) => l.produitId === produit.id)
        ? actuelles.map((l) => (l.produitId === produit.id ? { ...l, quantite: l.quantite + 1 } : l))
        : [...actuelles, { produitId: produit.id, produitNom: produit.produitNom, quantite: 1, motif: config.motifs[0] }]
    )
    setErreurs((e) => ({ ...e, lignes: undefined }))
  }
  /** Fenêtre « Liste » : les produits arrivent avec la quantité 0, à saisir ensuite */
  const ajouterDepuisLaListe = (produits: ProduitRecherche[]) => {
    setLignes((actuelles) => [
      ...actuelles,
      ...produits
        .filter((p) => !actuelles.some((l) => l.produitId === p.id))
        .map((p) => ({ produitId: p.id, produitNom: p.produitNom, quantite: 0, motif: config.motifs[0] })),
    ])
    setErreurs((e) => ({ ...e, lignes: undefined }))
  }
  const modifierLigne = (produitId: string, modif: Partial<LigneOperationDeStock>) =>
    setLignes((actuelles) => actuelles.map((l) => (l.produitId === produitId ? { ...l, ...modif } : l)))
  const retirerLigne = (produitId: string) => setLignes((actuelles) => actuelles.filter((l) => l.produitId !== produitId))

  const soumettre = (statut: OperationDeStock["statut"]) => {
    // Contrôles de saisie (les règles métier restent côté logique)
    const nouvellesErreurs: Erreurs = {}
    if (!magasinId) nouvellesErreurs.magasin = "Choisissez un magasin."
    if (estTransfert && !destinationId) nouvellesErreurs.destination = "Choisissez le magasin de destination."
    if (estTransfert && destinationId && destinationId === magasinId)
      nouvellesErreurs.destination = "Le magasin de destination doit être différent."
    if (statut === "validee" && lignes.length === 0) nouvellesErreurs.lignes = "Ajoutez au moins un produit."
    const aSaisir = lignes.filter(quantiteInvalide).length
    if (aSaisir > 0) nouvellesErreurs.lignes = t("Saisissez la quantité de {{v0}} produit(s) (en rouge).", { v0: aSaisir })
    setVerifierQuantites(aSaisir > 0)
    setErreurs(nouvellesErreurs)
    if (Object.keys(nouvellesErreurs).length > 0 || !magasinId) return

    onSoumettre({
      type,
      magasinId,
      magasinDestinationId: estTransfert ? destinationId ?? undefined : undefined,
      lignes,
      note: note.trim(),
      statut,
    })
  }

  const Icone = config.icone

  return (
    <div className="flex max-h-[calc(100svh-2rem)] flex-col">
      {/* en_tete */}
      <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-grid-line px-[18px] py-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-[38px] shrink-0 items-center justify-center rounded-lg", config.couleurSymbole)}>
            <Icone className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl leading-tight font-bold">{tr(config.titre)}</DialogTitle>
            {config.sousTitre ? (
              <DialogDescription className="text-[13px]">{tr(config.sousTitre)}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{t("Formulaire :")} {tr(config.titre)}</DialogDescription>
            )}
          </div>
        </div>
        <DialogClose
          render={<Button variant="outline" aria-label={t("Fermer")} className="size-[34px] shrink-0 rounded-sm border-grid-line p-0" />}
        >
          <X className="size-[18px]" />
        </DialogClose>
      </div>

      {/* formulaire */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4">
        <div className={cn("grid gap-3", estTransfert && "grid-cols-2")}>
          <Champ id={`magasin-${type}`} libelle={estTransfert ? t("Magasin d’origine") : t("Magasin")} erreur={erreurs.magasin} obligatoire>
            <StoreSelect
              id={`magasin-${type}`}
              stores={magasins}
              value={magasinId}
              onValueChange={(id) => {
                setMagasinId(id)
                setErreurs((e) => ({ ...e, magasin: undefined }))
              }}
              aria-invalid={!!erreurs.magasin}
              className="h-11 rounded-sm border-grid-line px-3 text-[13px] data-[size=default]:h-11"
            />
          </Champ>
          {estTransfert && (
            <Champ id="magasin-destination" libelle={t("Magasin de destination")} erreur={erreurs.destination} obligatoire>
              <StoreSelect
                id="magasin-destination"
                stores={magasins}
                value={destinationId}
                onValueChange={(id) => {
                  setDestinationId(id)
                  setErreurs((e) => ({ ...e, destination: undefined }))
                }}
                aria-invalid={!!erreurs.destination}
                className="h-11 rounded-sm border-grid-line px-3 text-[13px] data-[size=default]:h-11"
              />
            </Champ>
          )}
        </div>

        <RechercheDeProduit
          ref={rechercheRef}
          recherche={recherche}
          onRechercheChange={onRechercheChange}
          resultats={resultatsRecherche}
          onChoisir={ajouterProduit}
        />

        {/* produits */}
        <div className="flex flex-col">
          <div className="flex h-10 items-center gap-2.5 border-b border-grid-line bg-background px-3 text-[11px] font-bold text-muted-foreground">
            <span className="flex-1">{t("Produit")}</span>
            <span className="w-[72px] text-center" title={type === "correction" ? t("Quantité comptée") : t("Quantité")}>{t("Qté")}</span>
            <span className="w-[156px]">{t("Motif")}</span>
            <span className="w-8" aria-hidden />
          </div>
          {lignes.map((ligne) => (
            <div key={ligne.produitId} className="flex h-11 items-center gap-2.5 border-b border-grid-line px-3">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{ligne.produitNom}</span>
              <ChampNombre
                aria-label={t("Quantité pour {{v0}}", { v0: ligne.produitNom })}
                aria-invalid={verifierQuantites && quantiteInvalide(ligne)}
                valeur={Number.isFinite(ligne.quantite) ? String(ligne.quantite) : ""}
                onChange={(v) => modifierLigne(ligne.produitId, { quantite: v === "" ? Number.NaN : Number(v) })}
                onFocus={(e) => e.currentTarget.select()}
                className="h-[34px] w-[72px] rounded-sm border-grid-line px-1 text-center text-xs font-semibold tabular-nums md:text-xs"
              />
              <Select value={ligne.motif} onValueChange={(v) => v && modifierLigne(ligne.produitId, { motif: v })}>
                <SelectTrigger
                  aria-label={t("Motif pour {{v0}}", { v0: ligne.produitNom })}
                  className="h-[34px] w-[156px] rounded-sm border-grid-line bg-card px-2.5 text-[11px] data-[size=default]:h-[34px] [&>svg:last-child]:size-3"
                >
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="p-1 shadow-card">
                  {config.motifs.map((motif) => (
                    <SelectItem key={motif} value={motif} className="text-xs">
                      {motif}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Retirer {{v0}}", { v0: ligne.produitNom })}
                onClick={() => retirerLigne(ligne.produitId)}
                className="text-destructive hover:bg-danger-muted hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <Button
              variant="link"
              onClick={() => rechercheRef.current?.focus()}
              className="h-[30px] w-fit gap-1.5 px-0 text-[13px] font-semibold"
            >
              <Plus />
              {t("Ajouter un produit")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setListeOuverte(true)}
              className="h-[30px] gap-1.5 rounded-sm border-grid-line px-2.5 text-[13px] font-semibold text-primary"
            >
              <ListChecks />
              {t("Liste")}
            </Button>
          </div>
          {erreurs.lignes && (
            <p role="alert" className="text-xs text-destructive">
              {erreurs.lignes}
            </p>
          )}
        </div>

        {/* note */}
        <Champ id={`note-${type}`} libelle={t("Note")}>
          <Input
            id={`note-${type}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tr(config.indicationNote)}
            className="h-11 w-full rounded-sm border-grid-line px-3 text-[13px] md:text-[13px]"
          />
        </Champ>
      </div>

      {/* actions */}
      <div className="flex h-[72px] shrink-0 items-center justify-end gap-3 border-t border-grid-line px-[18px]">
        <Button
          variant="outline"
          onClick={() => soumettre("brouillon")}
          className="h-[42px] w-[104px] rounded-sm border-grid-line text-[13px] font-medium"
        >
          {t("Enregistrer")}
        </Button>
        <Button onClick={() => soumettre("validee")} className="h-[42px] w-[170px] rounded-sm text-[13px] font-semibold">
          {t("Valider")}
        </Button>
      </div>
      <ListeDesProduitsFenetre
        draft={draft}
        ouverte={listeOuverte}
        onOuvertureChange={setListeOuverte}
        produits={tousLesProduits}
        enChargement={tousLesProduitsEnChargement}
        dejaAjoutes={lignes.map((l) => l.produitId)}
        onAjouter={ajouterDepuisLaListe}
      />
      <span className="sr-only" aria-live="polite">
        {lignes.length} {t("produit(s) dans l’opération")}
      </span>
    </div>
  )
}

function Champ({
  id,
  libelle,
  erreur,
  obligatoire = false,
  children,
}: {
  id: string
  libelle: string
  erreur?: string
  obligatoire?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {tr(libelle)}
        {obligatoire && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {erreur && <p className="text-xs text-destructive">{tr(erreur)}</p>}
    </div>
  )
}
