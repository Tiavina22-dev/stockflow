import { useFormDraft, saveDraftOnServer } from "@/hooks/useFormDraft"
import { useDraftState } from "@/hooks/useLocalDraft"
import { t } from "@/i18n"
import { ariary } from "@/components/donnees/montants"
import { useState } from "react"
import {
  ArrowUpDown,
  Boxes,
  CircleDollarSign,
  CircleX,
  FileText,
  PackageCheck,
  Plus,
  Search,
  Store,
  Tags,
  TriangleAlert,
} from "lucide-react"

import { FiltreSelecteur, type OptionDeFiltre } from "@/components/donnees/filtre-selecteur"
import { IndicateurCle } from "@/components/donnees/indicateur-cle"
import { TAILLES_DE_PAGE } from "@/components/donnees/tableau-de-donnees"
import { ListeDuStock } from "@/components/stock/liste-du-stock"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useActiveStore } from "@/hooks/useActiveStore"
import { useStores } from "@/hooks/useStores"
import { notify } from "@/lib/notify"
import { CadreApplication } from "@/pages/cadre-application"
import { useFenetreProduit } from "@/pages/produits/fenetre-produit"
import { NouvelleOperationFenetre } from "@/components/stock/operations/nouvelle-operation-fenetre"
import { OperationDeStockFenetre } from "@/components/stock/operations/operation-de-stock-fenetre"
import { TYPES_D_OPERATION } from "@/components/stock/operations/types-d-operation"
import {
  enregistrerOperationProvisoire,
  useCategoriesDuStockProvisoires,
  useLignesDeStockProvisoires,
  useRechercheProduitsProvisoire,
  useResumeDuStockProvisoire,
} from "@/hooks/useStock"
import type {
  EtatDuStock,
  FiltresDuStock,
  LigneOperationDeStock,
  OperationDeStock,
  TriDuStock,
  TypeOperationDeStock,
} from "@/types"

const TOUTES = "__toutes__"

const optionsEtatDuStock: OptionDeFiltre<EtatDuStock | typeof TOUTES>[] = [
  { value: TOUTES, label: "Tous les états" },
  { value: "Disponible", label: "Disponible" },
  { value: "Stock faible", label: "Stock faible" },
  { value: "Rupture", label: "Rupture" },
]

const optionsTri: OptionDeFiltre<TriDuStock>[] = [
  { value: "nom-asc", label: "Nom (A → Z)" },
  { value: "nom-desc", label: "Nom (Z → A)" },
  { value: "stock-asc", label: "Stock croissant" },
  { value: "stock-desc", label: "Stock décroissant" },
]

const nombre = new Intl.NumberFormat("fr-FR")

/** Figma : frame `stock` (node 90:4459). */
export function StockPage() {
  const { data: magasins } = useStores()
  const [magasinActif, choisirMagasin] = useActiveStore()

  const [filtres, setFiltres] = useState<Omit<FiltresDuStock, "storeId">>({
    recherche: "",
    categorie: null,
    etatDuStock: null,
    tri: "nom-asc",
    page: 1,
    pageSize: TAILLES_DE_PAGE[0],
  })
  // Tout changement de filtre revient à la page 1
  const modifierFiltres = (modif: Partial<Omit<FiltresDuStock, "storeId" | "page">>) =>
    setFiltres((actuels) => ({ ...actuels, ...modif, page: 1 }))

  const filtresComplets: FiltresDuStock = { ...filtres, storeId: magasinActif?.id }
  const resume = useResumeDuStockProvisoire(magasinActif?.id)
  const lignes = useLignesDeStockProvisoires(filtresComplets, magasinActif?.name)
  const categories = useCategoriesDuStockProvisoires()
  const fenetreProduit = useFenetreProduit(categories.data ?? [])

  const optionsMagasin: OptionDeFiltre<string>[] = (magasins ?? []).map((m) => ({ value: m.id, label: m.name }))
  const optionsCategorie: OptionDeFiltre<string>[] = [
    { value: TOUTES, label: "Toutes les catégories" },
    ...(categories.data ?? []).map((c) => ({ value: c, label: c })),
  ]

  const bientot = (action: string) => notify("warning", t("{{v0}} : écran à venir.", { v0: action }))

  // Opérations de stock : fenêtre de choix puis fenêtre du type choisi
  const uiDraft = useFormDraft("stock-ui", magasinActif?.id)
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [operation, setOperation] = useDraftState<{
    type: TypeOperationDeStock
    lignesInitiales?: LigneOperationDeStock[]
  } | null>(uiDraft, "operation", null)
  const [rechercheProduit, setRechercheProduit] = useDraftState(uiDraft, "rechercheProduit", "")
  const draft = useFormDraft(`stock:${operation?.type ?? "none"}`, magasinActif?.id)
  const resultatsRecherche = useRechercheProduitsProvisoire(rechercheProduit, magasinActif?.id)
  // Fenêtre « Liste » de l'opération : produits du magasin (⚠️ 100 au plus en attendant un hook dédié, COORDINATION #28)
  const tousLesProduits = useLignesDeStockProvisoires({ storeId: magasinActif?.id, recherche: "", categorie: null, etatDuStock: null, tri: "nom-asc", page: 1, pageSize: 100 })

  const ouvrirOperation = (type: TypeOperationDeStock, lignesInitiales?: LigneOperationDeStock[]) => {
    setChoixOuvert(false)
    setRechercheProduit("")
    setOperation({ type, lignesInitiales })
  }
  const soumettreOperation = async (op: OperationDeStock) => {
    try {
      const result = await saveDraftOnServer(draft, key => enregistrerOperationProvisoire(op, key), op)
      for (const warning of result.warnings) notify("warning", warning)
    } catch (erreur) {
      // La fenêtre reste ouverte pour corriger la saisie
      notify("error", erreur instanceof Error ? erreur.message : t("L’opération a échoué."))
      return
    }
    setOperation(null)
    const titre = TYPES_D_OPERATION[op.type].titre
    notify("success", op.statut === "validee" ? t("{{v0}} validée.", { v0: titre }) : t("{{v0}} enregistrée en brouillon.", { v0: titre }))
  }

  return (
    <CadreApplication pageActive="stock">
      <main className="flex flex-col gap-4">
        {/* titre_et_action */}
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-2xl font-bold">{t("Stock")}</h1>
            <p className="text-sm text-muted-foreground">{t("Consultez et gérez les niveaux de stock de vos produits.")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" render={<a href="/stock/factures-fournisseurs" />} className="h-10 gap-2 rounded-sm border-grid-line px-3.5 text-[13px] font-semibold">
              <FileText className="size-[17px]" />
              {t("Factures fournisseurs")}
            </Button>
            <Button
              onClick={() => setChoixOuvert(true)}
              className="h-10 gap-2 rounded-sm px-3.5 text-[13px] font-normal"
            >
              <Plus className="size-[17px]" />
              {t("Nouvelle opération")}
            </Button>
          </div>
        </div>

        {/* recherche */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
          <Input
            type="search"
            aria-label={t("Rechercher un produit")}
            value={filtres.recherche}
            onChange={(e) => modifierFiltres({ recherche: e.target.value })}
            placeholder={t("Rechercher par produit, référence ou code-barres...")}
            className="h-12 rounded-sm border-grid-line pl-11 text-sm md:text-sm"
          />
        </div>

        {/* filtres */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[320fr_320fr_320fr_338fr]">
          <FiltreSelecteur
            icone={Store}
            libelle={t("Magasin")}
            options={optionsMagasin}
            valeur={magasinActif?.id ?? null}
            onChange={(id) => {
              choisirMagasin(id)
              modifierFiltres({})
            }}
            placeholder={t("Choisir un magasin")}
          />
          <FiltreSelecteur
            icone={Tags}
            libelle={t("Catégorie")}
            options={optionsCategorie}
            valeur={filtres.categorie ?? TOUTES}
            onChange={(v) => modifierFiltres({ categorie: v === TOUTES ? null : v })}
          />
          <FiltreSelecteur
            icone={PackageCheck}
            libelle={t("État du stock")}
            options={optionsEtatDuStock}
            valeur={filtres.etatDuStock ?? TOUTES}
            onChange={(v) => modifierFiltres({ etatDuStock: v === TOUTES ? null : v })}
          />
          <FiltreSelecteur
            icone={ArrowUpDown}
            libelle={t("Tri")}
            options={optionsTri}
            valeur={filtres.tri}
            onChange={(tri) => modifierFiltres({ tri })}
          />
        </div>

        {/* indicateurs_cles */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <IndicateurCle
            ton="info"
            icone={Boxes}
            libelle={t("Produits en stock")}
            valeur={resume.data ? nombre.format(resume.data.produitsEnStock) : ""}
            detail={resume.data?.produitDetail ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="succes"
            icone={CircleDollarSign}
            libelle={t("Valeur du stock")}
            valeur={resume.data ? ariary.format(resume.data.stockMontant) : ""}
            detail={resume.data?.stockMontantDetail ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="alerte"
            icone={TriangleAlert}
            libelle={t("Stock faible")}
            valeur={resume.data ? nombre.format(resume.data.stockFaible) : ""}
            detail={resume.data?.stockFaibleDetail ?? ""}
            enChargement={resume.isLoading}
          />
          <IndicateurCle
            ton="danger"
            icone={CircleX}
            libelle={t("Ruptures")}
            valeur={resume.data ? nombre.format(resume.data.ruptures) : ""}
            detail={resume.data?.rupturesDetail ?? ""}
            enChargement={resume.isLoading}
          />
        </div>

        {/* liste_du_stock */}
        <ListeDuStock
          lignes={lignes.data?.items ?? []}
          total={lignes.data?.total ?? 0}
          page={filtres.page}
          pageSize={filtres.pageSize}
          onPageChange={(page) => setFiltres((actuels) => ({ ...actuels, page }))}
          onPageSizeChange={(pageSize) => modifierFiltres({ pageSize })}
          onConsulter={(ligne) => bientot(`Fiche « ${ligne.produitNom} »`)}
          onModifier={(ligne) => fenetreProduit.modifierProduit(ligne.id)}
          onTransferer={(ligne) =>
            ouvrirOperation("transfert", [
              { produitId: ligne.id, produitNom: ligne.produitNom, quantite: 1, motif: TYPES_D_OPERATION.transfert.motifs[0] },
            ])
          }
          enChargement={lignes.isLoading}
          erreur={lignes.error}
        />
      </main>

      {fenetreProduit.fenetre}
      <NouvelleOperationFenetre open={choixOuvert} onOpenChange={setChoixOuvert} onChoisir={ouvrirOperation} />
      <OperationDeStockFenetre
        key={draft?.key}
        draft={draft}
        type={operation?.type ?? null}
        lignesInitiales={operation?.lignesInitiales}
        onFermer={() => setOperation(null)}
        magasins={magasins ?? []}
        magasinParDefautId={magasinActif?.id}
        recherche={rechercheProduit}
        onRechercheChange={setRechercheProduit}
        resultatsRecherche={resultatsRecherche}
        tousLesProduits={(tousLesProduits.data?.items ?? []).map((l) => ({ id: l.id, produitNom: l.produitNom, reference: l.reference, stockDisponible: l.stockDisponible, detail: l.categorie }))}
        tousLesProduitsEnChargement={tousLesProduits.isLoading}
        onSoumettre={soumettreOperation}
      />
    </CadreApplication>
  )
}
