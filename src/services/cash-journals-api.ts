import type { SaisieDuCahier } from "@/types"
import { api, invalidateApi } from "./http-api"
export type FinanceSummary = { salesTotal: string; expenseTotal: string; amountAfterExpenses: string; cashSales: string; cashExpenses: string; expectedCash: string; currencyLabel: string | null; unknownPaymentSales: string[] }
export type CashJournal = { id: string; status: "DRAFT" | "VALIDATED" | "CANCELLED"; createdAt: string; operations: { id: string; number: string; total: string }[]; finance: { id: string; kind: "EXPENSE" | "REMITTANCE"; number: string; amount: string; expectedAmount: string | null; difference: string | null }[]; attachments: { id: string; originalName: string }[] }
export async function saveCashJournal(s: SaisieDuCahier, requestKey: string) {
 const data = new FormData()
 data.append("payload", JSON.stringify({ shopId: s.magasinId, date: s.date, requestKey, status: s.statut === "validee" ? "VALIDATED" : "DRAFT", lines: s.lignes.map(l => ({ productId: l.produitId, quantity: String(l.quantite), unitPrice: String(l.prixUnitaire), note: l.note })), expenses: s.depenses.map(e => ({ amount: String(e.montant), reason: e.motif, note: e.note })), amountRemitted: s.versement.montantRemis === null ? undefined : String(s.versement.montantRemis), remittanceNote: s.versement.note }))
 for (const file of s.photos) data.append("photos", file)
 const journal = await api<CashJournal & { warnings?: string[] }>("/cash-journals", "POST", data)
 invalidateApi(); return { venteNumeros: journal.operations.map(s => s.number), warnings: journal.warnings ?? [] }
}
function query(shopId: string | undefined, date: string) { if (!shopId) throw new Error("Choisissez un magasin."); return new URLSearchParams({ shopId, from: date, to: date }).toString() }
export const getCashSummary = (id: string | undefined, date: string) => api<FinanceSummary>(`/reports/finance?${query(id, date)}`)
export const getCashJournals = (id: string | undefined, date: string) => api<CashJournal[]>(`/cash-journals?${query(id, date)}`)
export async function validateCashJournal(id: string) { const result = await api<{ warnings?: string[] }>(`/cash-journals/${id}/validate`, "POST"); invalidateApi(); return result.warnings ?? [] }
