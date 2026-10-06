import type { ProductRow, Store, User } from "../types/index.ts"

export const demoUser: User = { id: "user-chloe", firstName: "Chloé", name: "Chloé Martin", role: "Responsable magasin", initials: "CM" }
export const demoStores: Store[] = [
  { id: "paris-republique", name: "Paris · République" },
  { id: "paris-bastille", name: "Paris · Bastille" },
  { id: "lyon-part-dieu", name: "Lyon · Part-Dieu" },
  { id: "marseille-vieux-port", name: "Marseille · Vieux-Port" },
]

type DemoProduct = ProductRow & { storeId: string; sku: string; barcode: string }
const names = ["Café noir 250g", "Thé vert 100g", "Sucre bio 500g", "Chocolat noir 70%", "Miel de fleurs", "Riz basmati 1kg", "Huile d’olive 75cl", "Pâtes complètes", "Farine T65", "Lentilles vertes", "Sel de Guérande", "Confiture fraise"]
const quantities = [128, 42, 0, 64, 12, 90, 38, 0, 75, 8, 54, 33]
const values = [1280, 420, 0, 512, 168, 315, 494, 0, 97, 26, 162, 132]

export const demoProducts: DemoProduct[] = demoStores.flatMap((store, storeIndex) => names.map((name, index) => {
  const quantity = quantities[index] === 0 ? 0 : Math.max(0, quantities[index] - storeIndex * 7)
  return {
    id: `${store.id}-${index + 1}`, storeId: store.id, name,
    sku: `SF-${String(index + 1).padStart(4, "0")}`,
    barcode: `376000000${String(index + 1).padStart(4, "0")}`,
    quantity, value: quantities[index] ? Math.round(values[index] * quantity / quantities[index] * 100) / 100 : 0,
    status: quantity === 0 ? "Rupture" : quantity <= 42 ? "Faible" : "Validé",
  }
}))

// Historique de valorisation indépendant du stock actuel, pour calculer la tendance.
export const demoStockHistory: Record<string, number[]> = Object.fromEntries(demoStores.map((store, index) => [
  store.id, [3100, 3250, 3200, 3400, 3450, 3500, 3600].map(value => value * (1 - index * 0.15)),
]))
