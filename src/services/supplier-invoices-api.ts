import type { DetailDeFactureFournisseur, FactureFournisseur, FiltresDesFacturesFournisseurs, Paginated } from "@/types"
import { api, invalidateApi, photoData } from "./http-api"

type Invoice = { id: string; number: string; supplierName: string; supplierReference: string; businessDate: string; amount: string; status: "DRAFT" | "VALIDATED" | "CANCELLED"; lines: { id: string; productName: string; productReference: string; quantity: string; unitPrice: string }[]; attachments: { id: string; originalName: string; mimeType: string; size: number }[] }
const date = (s: string) => new Date(new Date(s).getTime() + 3 * 3600000).toISOString().slice(0, 10)
const row = (r: Invoice): FactureFournisseur => ({ id: r.id, numero: r.number, fournisseurNom: r.supplierName, date: date(r.businessDate), total: Number(r.amount), statut: r.status === "VALIDATED" ? "Validé" : r.status === "CANCELLED" ? "Annulé" : "Brouillon" })
export async function getFacturesFournisseurs(f: FiltresDesFacturesFournisseurs, shopId?: string): Promise<Paginated<FactureFournisseur>> {
  const q = new URLSearchParams({ du: f.du, au: f.au, recherche: f.recherche, page: String(f.page), pageSize: String(f.pageSize) })
  if (shopId) q.set("shopId", shopId)
  if (f.fournisseurId) q.set("fournisseurId", f.fournisseurId)
  const result = await api<Paginated<Invoice>>(`/supplier-invoices/consultation?${q}`)
  return { ...result, items: result.items.map(row) }
}
export async function getDetailDeFactureFournisseur(id: string | null): Promise<DetailDeFactureFournisseur | undefined> {
  if (!id) return undefined
  const r = await api<Invoice>(`/supplier-invoices/${encodeURIComponent(id)}`)
  const first = r.attachments[0]
  const file = first ? await photoData(`/finance/supplier-invoices/${encodeURIComponent(id)}/attachments/${first.id}`) : null
  return { ...row(r), reference: r.supplierReference, lignes: r.lines.map(l => ({ id: l.id, produitNom: l.productName, reference: l.productReference, quantite: Number(l.quantity), prixFournisseur: Number(l.unitPrice) })), pieceJointe: first && file ? { nom: first.originalName, type: first.mimeType, tailleKo: Math.ceil(first.size / 1024), url: file, apercuUrl: first.mimeType.startsWith("image/") ? file : undefined } : null }
}
export const getFournisseurs = (shopId?: string) => api<{ id: string; nom: string }[]>(`/supplier-invoices/suppliers${shopId ? `?shopId=${encodeURIComponent(shopId)}` : ""}`)
export async function validateFactureFournisseur(id: string) {
  await api(`/supplier-invoices/${encodeURIComponent(id)}/validate`, "POST")
  invalidateApi()
}
