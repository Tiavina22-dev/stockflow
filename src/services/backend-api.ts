import type { Store, User, FiltresDuStock, LigneDeStock, ResumeDuStock, ProduitRecherche, OperationDeStock, FiltresDesVentes, NouvelleVente, DetailDeVente, LigneDeVente, FiltresDuCahier, VenteDuCahier, FiltresDesProduits, ProduitSaisi, LigneDeProduit } from "@/types"
import { api, invalidateApi } from "./http-api"
import { getPreferences } from "./preferences-api"
type Product = { id: string; name: string; reference: string; barcode: string | null; category: { id: string; name: string }; unit: { id: string; name: string }; supplierPrice: string | null; salePrice: string | null; lowStockThreshold: string; active: boolean; photoUrl?: string; description?: string }
type Stock = { productId: string; shopId: string; shopName: string; quantity: string; product: Product }
type Sale = { id: string; number: string; businessDate: string; createdAt: string; shopId: string; shop: { name: string }; createdBy: { id: string; name: string }; status: "DRAFT" | "VALIDATED" | "CANCELLED"; total: string; discount: string; note?: string; lines: { productId: string; quantity: string; unitPrice: string; productName?: string; productReference?: string; product: Product }[] }
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim()
export function paginate<T>(items: T[], page: number, pageSize: number) {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("Pagination invalide.")
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }
}
export async function getStores(): Promise<Store[]> { return (await api<(Store & { active: boolean })[]>("/shops")).filter(s => s.active).map(({ id, name }) => ({ id, name })) }
export async function getCurrentUser(): Promise<User> {
  const u = await api<{ id: string; name: string; role: string }>("/auth/me")
  return { id: u.id, name: u.name, firstName: u.name.split(" ")[0], role: u.role, initials: u.name.split(" ").map(s => s[0]).slice(0, 2).join("") }
}
const shopQuery = (id?: string) => { if (!id) throw new Error("Choisissez un magasin."); return `shopId=${encodeURIComponent(id)}` }
export const getStock = (id?: string) => api<Stock[]>(`/stock?${shopQuery(id)}`)
export const getCategories = async () => (await api<{ name: string; active: boolean }[]>("/categories")).filter(c => c.active).map(c => c.name)
const state = (quantity: number, threshold: number): LigneDeStock["etat"] => quantity <= 0 ? "Rupture" : quantity <= threshold ? "Stock faible" : "Disponible"
export async function getStockRows(f: FiltresDuStock) {
  const rows = (await getStock(f.storeId)).filter(s => (!f.categorie || s.product.category.name === f.categorie) && [s.product.name, s.product.reference, s.product.barcode ?? ""].some(v => normalize(v).includes(normalize(f.recherche))))
    .map(s => ({ id: s.productId, produitNom: s.product.name, sousTitre: "Stock suivi", reference: s.product.reference, categorie: s.product.category.name, magasin: s.shopName, stockDisponible: Number(s.quantity), seuilAlerte: Number(s.product.lowStockThreshold), etat: state(Number(s.quantity), Number(s.product.lowStockThreshold)) }))
    .filter(s => !f.etatDuStock || s.etat === f.etatDuStock)
  rows.sort((a, b) => f.tri === "stock-asc" ? a.stockDisponible - b.stockDisponible : f.tri === "stock-desc" ? b.stockDisponible - a.stockDisponible : a.produitNom.localeCompare(b.produitNom, "fr") * (f.tri === "nom-desc" ? -1 : 1))
  return paginate(rows, f.page, f.pageSize)
}
export async function getStockSummary(id?: string): Promise<ResumeDuStock> {
  const stock = await getStock(id)
  return { produitsEnStock: stock.filter(s => Number(s.quantity) > 0).length, produitDetail: "Références disponibles", stockMontant: stock.reduce((n, s) => n + Math.max(0, Number(s.quantity)) * Number(s.product.supplierPrice ?? 0), 0), stockMontantDetail: stock.some(s => Number(s.quantity) > 0 && s.product.supplierPrice === null) ? "Valeur partielle : coûts manquants" : "Valorisation au coût fournisseur actuel", stockFaible: stock.filter(s => state(Number(s.quantity), Number(s.product.lowStockThreshold)) === "Stock faible").length, stockFaibleDetail: "À réapprovisionner", ruptures: stock.filter(s => Number(s.quantity) <= 0).length, rupturesDetail: "Stocks nuls ou négatifs" }
}
export async function searchProducts(id: string | undefined, search: string): Promise<ProduitRecherche[]> {
  if (!search.trim() || !id) return []
  return (await getStock(id)).filter(s => [s.product.name, s.product.reference, s.product.barcode ?? ""].some(v => normalize(v).includes(normalize(search)))).slice(0, 30).map(s => ({ id: s.productId, produitNom: s.product.name, reference: s.product.reference, stockDisponible: Number(s.quantity), prixUnitaire: Number(s.product.salePrice ?? 0), detail: s.product.category.name, photoUrl: s.product.photoUrl }))
}
const requestKeys = new WeakMap<object, string>()
function key(body: object) { let k = requestKeys.get(body); if (!k) { k = crypto.randomUUID(); requestKeys.set(body, k) } return k }
export const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Indian/Antananarivo" }).format(new Date())
export async function saveStock(op: OperationDeStock, requestKey?: string) {
  const types = { entree: "STOCK_IN", sortie: "STOCK_OUT", retour: "CUSTOMER_RETURN", transfert: "TRANSFER", correction: "INVENTORY_ADJUSTMENT" }
  const result = await api<{ warnings: string[] }>("/operations", "POST", { type: types[op.type], shopId: op.magasinId, destinationShopId: op.magasinDestinationId, businessDate: today(), lines: op.lignes.map(l => ({ productId: l.produitId, quantity: String(l.quantite), reason: l.motif })), note: op.note, status: op.statut === "validee" ? "VALIDATED" : "DRAFT", requestKey: requestKey ?? key(op) })
  invalidateApi()
  return result
}
const status = (s: Sale["status"]): LigneDeVente["statut"] => s === "VALIDATED" ? "Validée" : s === "CANCELLED" ? "Annulée" : "En attente"
const dateOf = (sale: Sale) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Indian/Antananarivo" }).format(new Date(sale.businessDate))
function inPeriod(s: Sale, period: FiltresDesVentes["periode"]) {
  const date = dateOf(s), now = today(), start = new Date(`${now}T00:00:00Z`)
  if (period === "tout") return true
  if (period === "aujourd-hui") return date === now
  if (period === "ce-mois") return date.slice(0, 7) === now.slice(0, 7) && date <= now
  start.setUTCDate(start.getUTCDate() - (period === "7-jours" ? 6 : 29)); return date >= start.toISOString().slice(0, 10) && date <= now
}
const sales = (id?: string) => api<Sale[]>(`/operations?${shopQuery(id)}`)
const saleRow = (s: Sale): LigneDeVente => ({ id: s.id, venteNumero: s.number, venteDate: s.businessDate, magasinNom: s.shop.name, nombreProduits: s.lines.length, venteMontant: Number(s.total), utilisateurNom: s.createdBy.name, statut: status(s.status) })
export async function getSales(f: FiltresDesVentes) {
  const rows = (await sales(f.storeId)).filter(s => inPeriod(s, f.periode) && (!f.statut || status(s.status) === f.statut) && (!f.utilisateurId || s.createdBy.id === f.utilisateurId) && [s.number, s.createdBy.name, ...s.lines.map(l => l.product.name)].some(v => normalize(v).includes(normalize(f.recherche)))).map(saleRow)
  return paginate(rows, f.page, f.pageSize)
}
export async function getSalesSummary(id: string | undefined, period: FiltresDesVentes["periode"]) {
  const all = await sales(id), rows = all.filter(s => inPeriod(s, period)), valid = rows.filter(s => s.status === "VALIDATED" && dateOf(s) === today())
  return { ventesAujourdHui: valid.length, ventesAujourdHuiEvolution: "Ventes validées du jour", venteMontant: valid.reduce((n, s) => n + Number(s.total), 0), venteMontantEvolution: "Après remises", aVerifier: rows.filter(s => s.status === "DRAFT").length, aVerifierDetail: "Brouillons de la période", ventesAnnulees: rows.filter(s => s.status === "CANCELLED").length, ventesAnnuleesDetail: "Sur la période choisie" }
}
export async function getSellers(id?: string) { return [...new Map((await sales(id)).map(s => [s.createdBy.id, { id: s.createdBy.id, nom: s.createdBy.name }])).values()] }
export async function getSale(id: string): Promise<DetailDeVente> {
  const s = await api<Sale>(`/operations/${id}`)
  return { ...saleRow(s), magasinId: s.shopId, vendeurNom: s.createdBy.name, articles: s.lines.map(l => ({ produitId: l.productId, produitNom: l.productName ?? l.product.name, produitReference: l.productReference ?? l.product.reference, produitQuantite: Number(l.quantity), produitPrixUnitaire: Number(l.unitPrice), photoUrl: l.product.photoUrl })), remise: Number(s.discount), note: s.note ?? "" }
}
export async function saveSale(sale: NouvelleVente, requestKey?: string) {
  const reason = sale.venteId ? window.prompt("Motif de la correction de vente :") : undefined
  if (sale.venteId && !reason?.trim()) throw new Error("Correction annulée : un motif est obligatoire.")
  const s = await api<Sale>(sale.venteId ? `/operations/${sale.venteId}/revisions` : "/operations", "POST", { type: "SALE", shopId: sale.magasinId, businessDate: sale.venteDate, lines: sale.lignes.map(l => ({ productId: l.produitId, quantity: String(l.quantite), unitPrice: String(l.prixUnitaire) })), discount: String(sale.remise), note: sale.note, reason, status: sale.statut === "validee" ? "VALIDATED" : "DRAFT", requestKey: requestKey ?? key(sale) })
  invalidateApi(); return { venteNumero: s.number, venteId: s.id, warnings: (s as Sale & { warnings?: string[] }).warnings ?? [] }
}
export async function changeSale(id: string, action: "valider" | "annuler") {
  const reason = action === "annuler" ? window.prompt("Motif de l’annulation :") : undefined
  if (action === "annuler" && (reason === null || ((await getPreferences()).ventes.motifObligatoirePourAnnulation && !reason?.trim()))) throw new Error("Annulation abandonnée : un motif est obligatoire.")
  await api(`/operations/${id}/${action === "valider" ? "validate" : "cancel"}`, "POST", action === "annuler" ? { reason: reason ?? "" } : undefined); invalidateApi()
}
export async function getBook(f: FiltresDuCahier) {
  const preferences = await getPreferences()
  const rows: VenteDuCahier[] = (await sales(f.storeId)).filter(s => dateOf(s) === f.date && (preferences.ventes.afficherVentesAnnulees || s.status !== "CANCELLED")).map(s => ({ id: s.id, venteNumero: s.number, venteDate: s.createdAt, vendeurNom: s.createdBy.name, articles: s.lines.map(l => ({ produitId: l.productId, produitNom: l.productName ?? l.product.name, produitReference: l.productReference ?? l.product.reference, produitQuantite: Number(l.quantity), produitPrixUnitaire: Number(l.unitPrice), photoUrl: l.product.photoUrl })), venteMontant: Number(s.total), venteQuantite: s.lines.reduce((n, l) => n + Number(l.quantity), 0), statut: status(s.status) }))
  return paginate(rows, f.page, f.pageSize)
}
export async function getBookSummary(id: string | undefined, date: string) {
  const valid = (await sales(id)).filter(s => dateOf(s) === date && s.status === "VALIDATED")
  return { venteMontant: valid.reduce((n, s) => n + Number(s.total), 0), ventes: valid.length, articles: valid.reduce((n, s) => n + s.lines.reduce((q, l) => q + Number(l.quantity), 0), 0) }
}
async function catalog() {
  const items: Product[] = []; let page = 1
  for (;;) { const result = await api<{ items: Product[]; total: number }>(`/products?page=${page}&pageSize=100`); items.push(...result.items); if (items.length >= result.total || !result.items.length) return items; page++ }
}
const productRow = (p: Product): LigneDeProduit => ({ id: p.id, nomDuProduit: p.name, reference: p.reference, codeBarres: p.barcode ?? "", categorie: p.category.name, unite: p.unit.name, prixDeVente: Number(p.salePrice ?? 0), statut: p.active ? "Actif" : "Inactif", photoUrl: p.photoUrl })
export async function getCatalog(f: FiltresDesProduits) {
  return paginate((await catalog()).map(productRow).filter(p => (!f.statut || p.statut === f.statut) && (!f.categorie || p.categorie === f.categorie) && [p.nomDuProduit, p.reference, p.codeBarres].some(v => normalize(v).includes(normalize(f.recherche)))), f.page, f.pageSize)
}
export async function getProduct(id: string): Promise<ProduitSaisi> {
  const p = await api<Product>(`/products/${id}`)
  return { ...productRow(p), produitId: p.id, prixFournisseur: p.supplierPrice === null ? null : Number(p.supplierPrice), seuilDeStockFaible: Number(p.lowStockThreshold), photo: null, description: p.description ?? "" }
}
export async function saveProduct(p: ProduitSaisi) {
  const refs = async (kind: string, name: string) => { const list = await api<{ id: string; name: string }[]>(`/${kind}`); const found = list.find(r => normalize(r.name) === normalize(name)); return found?.id ?? (await api<{ id: string }>(`/${kind}`, "POST", { name })).id }
  const categoryId = await refs("categories", p.categorie), unitId = await refs("units", p.unite)
  const result = await api<Product>(p.produitId ? `/products/${p.produitId}` : "/products", p.produitId ? "PATCH" : "POST", { name: p.nomDuProduit, reference: p.reference, barcode: p.codeBarres || undefined, categoryId, unitId, supplierPrice: p.prixFournisseur === null ? null : String(p.prixFournisseur), salePrice: String(p.prixDeVente), lowStockThreshold: String(p.seuilDeStockFaible), active: p.statut === "Actif", description: p.description, reason: "Modification depuis le catalogue" })
  if (p.photo) { const form = new FormData(); form.append("photo", p.photo); await api(`/products/${result.id}/photo`, "POST", form) }
  invalidateApi()
}
export async function changeProduct(id: string, statut: "Actif" | "Inactif") { await api(`/products/${id}`, "PATCH", { active: statut === "Actif" }); invalidateApi() }
