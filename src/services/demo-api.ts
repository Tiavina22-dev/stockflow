import type { Kpi, Paginated, ProductRow, Store, User } from "../types/index.ts"
import { demoProducts, demoStockHistory, demoStores, demoUser } from "../mocks/data.ts"

export type ProductsParams = { storeId: string | undefined; search?: string; page: number; pageSize: number }
function requireStore(storeId: string | undefined): string {
  if (!storeId || !demoStores.some(store => store.id === storeId)) throw new Error("Magasin introuvable.")
  return storeId
}
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim()
}
export async function getCurrentUser(): Promise<User> { return { ...demoUser } }
export async function getStores(): Promise<Store[]> { return demoStores.map(store => ({ ...store })) }
export async function getProducts(params: ProductsParams): Promise<Paginated<ProductRow>> {
  const storeId = requireStore(params.storeId)
  if (!Number.isSafeInteger(params.page) || params.page < 1 || !Number.isSafeInteger(params.pageSize) || params.pageSize < 1) {
    throw new Error("La page et la taille de page doivent être des entiers positifs.")
  }
  const query = normalize(params.search ?? "")
  const matches = demoProducts.filter(product => product.storeId === storeId && [product.name, product.sku, product.barcode].some(value => normalize(value).includes(query)))
  const start = (params.page - 1) * params.pageSize
  return { items: matches.slice(start, start + params.pageSize).map(({ id, name, quantity, value, status }) => ({ id, name, quantity, value, status })), total: matches.length, page: params.page, pageSize: params.pageSize }
}
export async function getStockKpis(storeId: string | undefined): Promise<Kpi[]> {
  const id = requireStore(storeId)
  const value = Math.round(demoProducts.filter(product => product.storeId === id).reduce((sum, product) => sum + product.value, 0) * 100) / 100
  const history = demoStockHistory[id]
  const previous = history[0]
  return [{ id: "stock-value", title: "Valeur du stock", subtitle: "Tous les produits · aujourd’hui", value: `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} Ar`, trend: previous === 0 ? 0 : Math.round((value - previous) / previous * 1000) / 10, trendLabel: "vs. mois dernier", series: [...history, value] }]
}
