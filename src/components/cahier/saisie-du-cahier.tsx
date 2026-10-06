import type { LocalDraft } from "@/types/local-drafts"
import { useDraftState } from "@/hooks/useLocalDraft"
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { Calculator, ClipboardList, Info, Maximize2, Minimize2, Package, Plus, ReceiptText, Save, Search, Store, Trash2, type LucideIcon } from "lucide-react"

import { FenetreDeValidation } from "@/components/cahier/fenetre-de-validation"
import { ariary } from "@/components/donnees/montants"
import { RechercheDeProduit } from "@/components/donnees/recherche-de-produit"
import { ChampDate, dateDuJour } from "@/components/forms/champ-date"
import { Button } from "@/components/ui/button"
import { ChampNombre } from "@/components/forms/champ-nombre"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { DepenseDuCahier, LigneDuCahierSaisie, ProduitRecherche, SaisieDuCahier, Store as Magasin } from "@/types"
import { t, tr } from "@/i18n"

const nombre = new Intl.NumberFormat("fr-FR")
const nouvelleCle = () => Math.random().toString(36).slice(2, 10)
/** « 35 000 » / « 35000,5 » → nombre ; null si vide ou invalide. */
const lireNombre = (texte: string) => {
  const n = Number(texte.replace(/\s/g, "").replace(",", "."))
  return texte.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n
}

/** Ligne du tableau : la saisie reste en texte tant qu'elle est modifiée. */
type LigneEditable = Omit<LigneDuCahierSaisie, "quantite" | "prixUnitaire"> & { quantite: string; prixUnitaire: string; photoUrl?: string }
type DepenseEditable = { cle: string; libelle: string; montant: string; note: string }

type SaisieDuCahierProps = {
  draft?: LocalDraft
  magasins: Magasin[]
  magasinId: string | null
  onMagasinChange: (magasinId: string) => void
  /** `Utilisateur_nom` (lecture seule) */
  utilisateurNom: string
  /** `Cahier_identifiant` ; absent tant que le cahier n'est pas enregistré */
  numeroDuCahier?: string
  recherche: string
  onRechercheChange: (recherche: string) => void
  resultatsRecherche: ProduitRecherche[]
  /** Rejette avec `Error(message)` en cas de refus */
  onEnregistrer: (saisie: SaisieDuCahier) => Promise<void>
}

/** Figma : `saisie_du_cahier` (node 228:5372). */
export function SaisieDuCahierFormulaire({ draft,
  magasins,
  magasinId,
  onMagasinChange,
  utilisateurNom,
  numeroDuCahier,
  recherche,
  onRechercheChange,
  resultatsRecherche,
  onEnregistrer,
}: SaisieDuCahierProps) {
  const [date, setDate] = useDraftState(draft, "date", dateDuJour())
  const [lignes, setLignes] = useDraftState<LigneEditable[]>(draft, "lignes", [])
  const [depenses, setDepenses] = useDraftState<DepenseEditable[]>(draft, "depenses", [])
  const [enCours, setEnCours] = useState<SaisieDuCahier["statut"] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtreLignes, setFiltreLignes] = useState("")
  const [pleinEcran, setPleinEcran] = useState(false)
  /** Dépense qui vient d'être ajoutée : son libellé prend le focus */
  const [nouvelleDepense, setNouvelleDepense] = useState<string | null>(null)

  // 1. Saisie rapide
  const [produit, setProduit] = useDraftState<ProduitRecherche | null>(draft, "produit", null)
  const [quantite, setQuantite] = useDraftState(draft, "quantite", "1")
  const [prix, setPrix] = useDraftState(draft, "prix", "")
  const [note, setNote] = useDraftState(draft, "note", "")
  const rechercheRef = useRef<HTMLInputElement>(null)
  const quantiteRef = useRef<HTMLInputElement>(null)

  const quantiteLue = lireNombre(quantite)
  const prixLu = lireNombre(prix)
  const saisieValide = produit !== null && quantiteLue !== null && quantiteLue > 0 && prixLu !== null

  const totalVentes = lignes.reduce((s, l) => s + (lireNombre(l.quantite) ?? 0) * (lireNombre(l.prixUnitaire) ?? 0), 0)
  const totalDepenses = depenses.reduce((s, d) => s + (lireNombre(d.montant) ?? 0), 0)
  const reste = totalVentes - totalDepenses

  const lignesAffichees = useMemo(() => {
    const f = filtreLignes.trim().toLowerCase()
    return lignes.map((l, i) => ({ ligne: l, numero: i + 1 })).filter(({ ligne }) => !f || `${ligne.produitNom} ${ligne.reference} ${ligne.note}`.toLowerCase().includes(f))
  }, [lignes, filtreLignes])

  const choisirProduit = (p: ProduitRecherche) => {
    setProduit(p)
    if (p.prixUnitaire !== undefined) setPrix(String(p.prixUnitaire))
    onRechercheChange(p.produitNom)
    requestAnimationFrame(() => quantiteRef.current?.select())
  }

  const ajouterLigne = (dupliquer = false) => {
    if (!saisieValide || !produit) return
    setLignes((ls) => [
      ...ls,
      { cle: nouvelleCle(), produitId: produit.id, produitNom: produit.produitNom, reference: produit.reference, photoUrl: produit.photoUrl, quantite: String(quantiteLue), prixUnitaire: String(prixLu), note: note.trim() },
    ])
    if (dupliquer) return // Shift+Entrée : même produit, prêt à être ressaisi
    setProduit(null)
    setQuantite("1")
    setPrix("")
    setNote("")
    onRechercheChange("")
    rechercheRef.current?.focus()
  }
  // Entrée ajoute, Shift+Entrée ajoute en gardant le produit (duplique)
  const toucheSaisie = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    ajouterLigne(e.shiftKey)
  }

  const modifierLigne = (cle: string, modif: Partial<LigneEditable>) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...modif } : l)))
  const modifierDepense = (cle: string, modif: Partial<DepenseEditable>) => setDepenses((ds) => ds.map((d) => (d.cle === cle ? { ...d, ...modif } : d)))

  /** Vérifie la saisie ; renvoie les lignes et dépenses prêtes à envoyer, ou `null` (message affiché). */
  const preparer = () => {
    setErreur(null)
    if (!magasinId) return setErreur(t("Choisissez le magasin.")), null
    if (lignes.length === 0 && depenses.length === 0) return setErreur(t("Ajoutez au moins une ligne ou une dépense.")), null
    const ligneInvalide = lignes.findIndex((l) => !(lireNombre(l.quantite)! > 0) || lireNombre(l.prixUnitaire) === null)
    if (ligneInvalide >= 0) return setErreur(t("Ligne {{v0}} : quantité ou prix invalide.", { v0: ligneInvalide + 1 })), null
    const depensesRemplies = depenses.filter((d) => d.libelle.trim() || d.montant.trim())
    const depenseInvalide = depensesRemplies.findIndex((d) => !d.libelle.trim() || !(lireNombre(d.montant)! > 0))
    if (depenseInvalide >= 0) return setErreur(t("Dépense {{v0}} : libellé et montant obligatoires.", { v0: depenseInvalide + 1 })), null
    return {
      magasinId,
      date,
      lignes: lignes.map(({ photoUrl: _photo, ...l }): LigneDuCahierSaisie => ({ ...l, quantite: lireNombre(l.quantite)!, prixUnitaire: lireNombre(l.prixUnitaire)! })),
      depenses: depensesRemplies.map((d): DepenseDuCahier => ({ cle: d.cle, motif: d.libelle.trim(), montant: lireNombre(d.montant)!, note: d.note.trim() })),
    }
  }

  const enregistrerBrouillon = async () => {
    const saisie = preparer()
    if (!saisie) return
    setEnCours("brouillon")
    try {
      await onEnregistrer({ ...saisie, versement: { montantRemis: null, note: "" }, photos: [], statut: "brouillon" })
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t("L’enregistrement a échoué."))
    } finally {
      setEnCours(null)
    }
  }

  /** « Continuer vers la validation » : ouvre l'étape versement + photos si la saisie est correcte. */
  const [validationOuverte, setValidationOuverte] = useDraftState(draft, "validationOuverte", false)
  const continuer = () => {
    if (preparer()) setValidationOuverte(true)
  }
  const valider = async (versement: SaisieDuCahier["versement"], photos: File[]) => {
    const saisie = preparer()
    if (!saisie) throw new Error("La saisie contient une erreur : revenez à la saisie pour la corriger.")
    setEnCours("validee")
    try {
      await onEnregistrer({ ...saisie, versement, photos, statut: "validee" })
    } finally {
      setEnCours(null)
    }
  }

  const tableauDesLignes = (
    <Tableau
      colonnes="grid-cols-[48px_44px_minmax(130px,1.4fr)_minmax(90px,1fr)_76px_minmax(100px,130px)_minmax(100px,130px)_minmax(110px,1.4fr)_64px]"
      entetes={["N°", "", "Produit", "Référence", "Qté", "Prix unitaire (Ar)", "Total (Ar)", "Note", "Actions"]}
      vide={lignes.length === 0 ? t("Aucune ligne : utilisez la saisie rapide ci-dessus.") : t("Aucune ligne ne correspond à la recherche.")}
      lignes={lignesAffichees.map(({ ligne: l, numero }) => ({
        cle: l.cle,
        cellules: [
          <span key="n" className="tabular-nums">{numero}</span>,
          <PhotoProduit key="p" url={l.photoUrl} nom={l.produitNom} taille="size-9" />,
          <span key="nom" className="truncate font-medium" title={l.produitNom}>{l.produitNom}</span>,
          <span key="ref" className="truncate text-muted-foreground">{l.reference}</span>,
          <CelluleSaisie key="q" libelle={t("Quantité ligne {{v0}}", { v0: numero })} valeur={l.quantite} onChange={(quantite) => modifierLigne(l.cle, { quantite })} numerique decimales={3} />,
          <CelluleSaisie key="pu" libelle={t("Prix unitaire ligne {{v0}}", { v0: numero })} valeur={l.prixUnitaire} onChange={(prixUnitaire) => modifierLigne(l.cle, { prixUnitaire })} numerique />,
          <span key="t" className="font-semibold tabular-nums">{nombre.format((lireNombre(l.quantite) ?? 0) * (lireNombre(l.prixUnitaire) ?? 0))}</span>,
          <CelluleSaisie key="note" libelle={t("Note ligne {{v0}}", { v0: numero })} valeur={l.note} onChange={(n) => modifierLigne(l.cle, { note: n })} />,
          <BoutonSupprimer key="s" nom={`la ligne ${numero}`} onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))} />,
        ],
      }))}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      {/* informations_du_cahier */}
      <section className="flex flex-wrap items-center gap-7 rounded-lg border border-grid-line bg-card p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <Store className="size-[22px]" />
        </span>
        <div className="grid min-w-0 flex-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
          <Champ libelle={t("Magasin")} obligatoire htmlFor="cahier-magasin">
            <Select items={magasins.map((m) => ({ value: m.id, label: m.name }))} value={magasinId} onValueChange={(v) => v && onMagasinChange(v)}>
              <SelectTrigger id="cahier-magasin" className="h-12 w-full rounded-sm border-input bg-card px-4 text-sm data-[size=default]:h-12">
                <SelectValue placeholder={t("Choisir un magasin")} />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} sideOffset={6} className="p-1 shadow-card">
                {magasins.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="h-9 px-3 text-[13px]">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Champ>
          <Champ libelle={t("Date")} obligatoire>
            <ChampDate aria-label={t("Date du cahier")} valeur={date} max={dateDuJour()} onChange={setDate} />
          </Champ>
          <Champ libelle={t("N° du cahier")} htmlFor="cahier-numero">
            <Input id="cahier-numero" readOnly value={numeroDuCahier ?? ""} placeholder={t("Attribué à l’enregistrement")} className="h-12 rounded-sm border-input bg-background px-4 text-sm text-muted-foreground md:text-sm" />
          </Champ>
          <Champ libelle={t("Utilisateur")} htmlFor="cahier-utilisateur">
            <Input id="cahier-utilisateur" readOnly value={utilisateurNom} className="h-12 rounded-sm border-input bg-background px-4 text-sm text-muted-foreground md:text-sm" />
          </Champ>
        </div>
      </section>

      {/* contenu */}
      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_368px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 1. saisie_rapide */}
          <Carte icone={ClipboardList} titre={t("1. Saisie rapide")}>
            <div className="@container">
            <div className="grid grid-cols-2 items-end gap-3 @min-[640px]:grid-cols-[110px_150px_minmax(0,1fr)_auto] @min-[1100px]:grid-cols-[minmax(0,610fr)_138px_168px_190px_auto]">
              <Champ libelle={t("Produit / Référence / code-barres")} obligatoire className="col-span-2 @min-[640px]:col-span-4 @min-[1100px]:col-span-1">
                <div onKeyDown={(e) => e.key === "Tab" && !e.shiftKey && produit && (e.preventDefault(), quantiteRef.current?.select())}>
                  <RechercheDeProduit
                    ref={rechercheRef}
                    placeholder={t("Tapez un nom, une référence ou scannez un code-barres...")}
                    recherche={recherche}
                    onRechercheChange={(r) => {
                      onRechercheChange(r)
                      if (produit && r !== produit.produitNom) setProduit(null)
                    }}
                    resultats={resultatsRecherche}
                    onChoisir={choisirProduit}
                  />
                </div>
              </Champ>
              <Champ libelle={t("Qté")} obligatoire htmlFor="saisie-quantite">
                <ChampNombre getInputRef={quantiteRef} id="saisie-quantite" decimales={3} valeur={quantite} onChange={setQuantite} onKeyDown={toucheSaisie} aria-invalid={quantite !== "" && !(quantiteLue! > 0)} className="h-11 rounded-sm border-grid-line px-3 text-[13px] tabular-nums md:text-[13px]" />
              </Champ>
              <Champ libelle={t("Prix unitaire (Ar)")} obligatoire htmlFor="saisie-prix">
                <ChampNombre id="saisie-prix" valeur={prix} onChange={setPrix} onKeyDown={toucheSaisie} aria-invalid={prix !== "" && prixLu === null} placeholder="0" className="h-11 rounded-sm border-grid-line px-3 text-[13px] tabular-nums md:text-[13px]" />
              </Champ>
              <Champ libelle={t("Note")} htmlFor="saisie-note" className="col-span-2 @min-[640px]:col-span-1">
                <Input id="saisie-note" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={toucheSaisie} placeholder={t("Facultatif")} className="h-11 rounded-sm border-grid-line px-3 text-[13px] md:text-[13px]" />
              </Champ>
              <Button type="button" disabled={!saisieValide} onClick={() => ajouterLigne()} className="col-span-2 h-11 rounded-sm px-5 text-[13px] font-semibold whitespace-nowrap @min-[640px]:col-span-1">
                {t("Ajouter (Entrée ↵)")}
              </Button>
            </div>
            </div>

            {/* suggestion_produit */}
            {produit && (
              <div className="flex items-center gap-3 rounded-sm bg-accent p-2.5">
                <PhotoProduit url={produit.photoUrl} nom={produit.produitNom} taille="size-[42px]" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-sm font-semibold">{produit.produitNom}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {produit.reference}
                    {produit.prixUnitaire !== undefined && ` · ${ariary.format(produit.prixUnitaire)}`}
                    {produit.stockDisponible !== undefined && t(" · stock {{v0}}", { v0: nombre.format(produit.stockDisponible) })}
                  </p>
                </div>
              </div>
            )}

            {/* astuce */}
            <p className="flex items-center gap-2.5 rounded-sm bg-background px-2.5 py-2.5 text-xs text-muted-foreground">
              <Info className="size-[18px] shrink-0 text-primary" />
              {t("Astuce : tapez la référence puis Entrée pour saisir rapidement. Les lignes identiques restent séparées.")}
            </p>
          </Carte>

          {/* 2. lignes_du_cahier */}
          <Carte
            icone={ClipboardList}
            titre={t("2. Lignes du cahier")}
            action={
              <div className="flex items-center gap-5">
                <div className="relative w-[306px] max-w-full">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" aria-label={t("Rechercher dans les lignes")} value={filtreLignes} onChange={(e) => setFiltreLignes(e.target.value)} placeholder={t("Rechercher dans les lignes...")} className="h-[42px] rounded-sm border-grid-line pl-9 text-xs md:text-xs" />
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={pleinEcran ? t("Réduire le tableau") : t("Afficher le tableau en plein écran")} aria-pressed={pleinEcran} onClick={() => setPleinEcran((p) => !p)} className="text-primary">
                  {pleinEcran ? <Minimize2 /> : <Maximize2 />}
                </Button>
              </div>
            }
            className={cn(pleinEcran && "fixed inset-4 z-50 overflow-auto shadow-2xl")}
          >
            {tableauDesLignes}
            <p className="flex items-center gap-1.5 text-[11px] text-primary">
              <Info className="size-3" />
              {t("Tab passe à la quantité • Shift+Entrée duplique")}
            </p>
            <PiedDeTableau
              action="Ajouter une ligne"
              onAction={() => rechercheRef.current?.focus()}
              total={t("Total ventes : {{v0}}", { v0: ariary.format(totalVentes) })}
            />
          </Carte>
          {pleinEcran && <div aria-hidden className="fixed inset-0 z-40 bg-foreground/30" onClick={() => setPleinEcran(false)} />}

          {/* 3. depenses */}
          <Carte icone={ReceiptText} titre={t("3. Dépenses")} description={t("Ajoutez les dépenses de la journée (transport, divers, etc.).")}>
            <Tableau
              colonnes="grid-cols-[minmax(48px,148fr)_minmax(140px,362fr)_minmax(110px,284fr)_minmax(140px,428fr)_64px]"
              entetes={["N°", "Libellé", "Montant (Ar)", "Note", "Actions"]}
              vide={t("Aucune dépense pour cette journée.")}
              lignes={depenses.map((d, i) => ({
                cle: d.cle,
                cellules: [
                  <span key="n" className="tabular-nums">{i + 1}</span>,
                  <CelluleSaisie key="l" libelle={t("Libellé dépense {{v0}}", { v0: i + 1 })} valeur={d.libelle} onChange={(libelle) => modifierDepense(d.cle, { libelle })} placeholder={t("Ex. transport")} autoFocus={d.cle === nouvelleDepense} />,
                  <CelluleSaisie key="m" libelle={t("Montant dépense {{v0}}", { v0: i + 1 })} valeur={d.montant} onChange={(montant) => modifierDepense(d.cle, { montant })} numerique placeholder="0" />,
                  <CelluleSaisie key="note" libelle={t("Note dépense {{v0}}", { v0: i + 1 })} valeur={d.note} onChange={(n) => modifierDepense(d.cle, { note: n })} />,
                  <BoutonSupprimer key="s" nom={`la dépense ${i + 1}`} onClick={() => setDepenses((ds) => ds.filter((x) => x.cle !== d.cle))} />,
                ],
              }))}
            />
            <PiedDeTableau
              action="Ajouter une dépense"
              onAction={() => {
                const cle = nouvelleCle()
                setDepenses((ds) => [...ds, { cle, libelle: "", montant: "", note: "" }])
                setNouvelleDepense(cle)
              }}
              total={t("Total dépenses : {{v0}}", { v0: ariary.format(totalDepenses) })}
            />
          </Carte>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" disabled={enCours !== null} onClick={enregistrerBrouillon} className="h-11 w-[247px] gap-2 rounded-sm border-grid-line text-[13px] font-normal text-primary">
              <Save className="size-4" />
              {enCours === "brouillon" ? t("Enregistrement…") : t("Enregistrer en brouillon")}
            </Button>
            {erreur && (
              <p role="alert" className="text-[13px] text-destructive">
                {tr(erreur)}
              </p>
            )}
          </div>
        </div>

        {/* recapitulatif */}
        <Carte icone={Calculator} titre={t("Récapitulatif")} className="@container -order-1 2xl:sticky 2xl:top-4 2xl:order-none">
          <div className="grid gap-4 @min-[700px]:grid-cols-[1fr_1fr_1.3fr_minmax(220px,1fr)] @min-[700px]:items-end 2xl:grid-cols-1!">
          <dl className="contents">
            <div className="flex flex-col gap-1.5">
              <dt className="text-[13px] text-muted-foreground">{t("Total ventes")}</dt>
              <dd className="text-lg font-bold tabular-nums">{ariary.format(totalVentes)}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-[13px] text-muted-foreground">{t("Total dépenses")}</dt>
              <dd className="text-lg font-bold tabular-nums">{ariary.format(totalDepenses)}</dd>
            </div>
          </dl>
          <div className={cn("flex flex-col gap-2 rounded-sm p-3.5", reste < 0 ? "bg-danger-muted text-destructive" : "bg-success-muted text-success")}>
            <p className="text-[13px] font-semibold">{t("Reste (Ventes - Dépenses)")}</p>
            <p className="text-xl font-bold tabular-nums">{ariary.format(reste)}</p>
          </div>
          <Button type="button" disabled={enCours !== null} onClick={continuer} className="h-auto min-h-11 w-full rounded-sm py-2 text-[13px] font-semibold whitespace-normal">
            {t("Continuer vers la validation")}
          </Button>
          </div>
        </Carte>
      </div>

      <FenetreDeValidation
        draft={draft}
        ouverte={validationOuverte}
        onFermer={() => setValidationOuverte(false)}
        totalVentes={totalVentes}
        totalDepenses={totalDepenses}
        nombreDeLignes={lignes.length}
        onValider={valider}
      />
    </div>
  )
}

/** Carte de section (Figma : `saisie_rapide`, `lignes_du_cahier`, `depenses`, `recapitulatif`). */
function Carte({ icone: Icone, titre, description, action, className, children }: { icone: LucideIcon; titre: string; description?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-lg border border-grid-line bg-card p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
            <Icone className="size-[22px]" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg leading-tight font-bold">{tr(titre)}</h2>
            {description && <p className="text-sm text-muted-foreground">{tr(description)}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Champ({ libelle, obligatoire = false, htmlFor, className, children }: { libelle: string; obligatoire?: boolean; htmlFor?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="truncate text-xs font-semibold">
        {tr(libelle)}
        {obligatoire && " *"}
      </label>
      {children}
    </div>
  )
}

/** Tableau quadrillé avec cellules modifiables (Figma : calques `tableau` / `colonne_tableau`). */
function Tableau({ colonnes, entetes, lignes, vide }: { colonnes: string; entetes: string[]; lignes: { cle: string; cellules: ReactNode[] }[]; vide: string }) {
  return (
    <div className="overflow-x-auto">
      <div role="table" className="min-w-[740px] border border-muted-foreground/25 text-[13px]">
        <div role="row" className={cn("grid bg-background text-center text-xs font-semibold", colonnes)}>
          {entetes.map((e, i) => (
            <span key={i} role="columnheader" className="border-r border-muted-foreground/25 px-2.5 py-1.5 last:border-r-0">
              {tr(e)}
            </span>
          ))}
        </div>
        {lignes.length === 0 ? (
          <p className="border-t border-muted-foreground/25 py-5 text-center text-muted-foreground">{vide}</p>
        ) : (
          lignes.map((l) => (
            <div key={l.cle} role="row" className={cn("grid min-h-12 border-t border-muted-foreground/25", colonnes)}>
              {l.cellules.map((c, i) => (
                <div key={i} role="cell" className="flex min-w-0 items-center border-r border-muted-foreground/25 px-2.5 last:justify-center last:border-r-0">
                  {c}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Cellule modifiable directement dans le tableau (souligné, sans cadre). */
function CelluleSaisie({ libelle, valeur, onChange, numerique = false, decimales = 0, placeholder, autoFocus }: { libelle: string; valeur: string; onChange: (valeur: string) => void; numerique?: boolean; decimales?: number; placeholder?: string; autoFocus?: boolean }) {
  const invalide = numerique && valeur.trim() !== "" && lireNombre(valeur) === null
  const classe = cn(
    "h-8 w-full min-w-0 border-0 border-b border-grid-line bg-transparent text-[13px] outline-none focus:border-primary aria-invalid:border-destructive",
    numerique && "tabular-nums"
  )
  if (numerique)
    return <ChampNombre natif decimales={decimales} aria-label={tr(libelle)} autoFocus={autoFocus} valeur={valeur} placeholder={tr(placeholder)} onChange={onChange} aria-invalid={invalide} className={classe} />
  return (
    <input
      aria-label={tr(libelle)}
      autoFocus={autoFocus}
      inputMode={numerique ? "decimal" : undefined}
      value={valeur}
      placeholder={tr(placeholder)}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalide}
      className={cn(
        "h-8 w-full min-w-0 border-0 border-b border-grid-line bg-transparent text-[13px] outline-none focus:border-primary aria-invalid:border-destructive",
        numerique && "tabular-nums"
      )}
    />
  )
}

function PhotoProduit({ url, nom, taille }: { url?: string; nom: string; taille: string }) {
  return url ? (
    <img src={url} alt="" title={nom} className={cn("shrink-0 rounded-sm bg-background object-cover", taille)} />
  ) : (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground", taille)}>
      <Package className="size-4" />
    </span>
  )
}

function PiedDeTableau({ action, onAction, total }: { action: string; onAction: () => void; total: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-accent p-2">
      <Button type="button" variant="outline" onClick={onAction} className="h-11 w-[247px] gap-2 rounded-sm border-0 bg-card text-[13px] font-normal text-primary hover:bg-card/80">
        <Plus className="size-4" />
        {tr(action)}
      </Button>
      <p className="pr-2 text-base font-bold text-primary tabular-nums">{total}</p>
    </div>
  )
}

function BoutonSupprimer({ nom, onClick }: { nom: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={t("Supprimer {{v0}}", { v0: nom })} onClick={onClick} className="text-destructive hover:bg-danger-muted">
      <Trash2 />
    </Button>
  )
}
