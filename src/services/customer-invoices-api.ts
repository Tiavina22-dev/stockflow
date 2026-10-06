import type { ClientDeFacture, FactureClientCreee, SaisieDeFactureClient } from "@/types"
import { api, invalidateApi } from "./http-api"

type Customer = { id: string; name: string; nif: string | null; stat: string | null; address: string | null; phone: string | null; active: boolean }
export async function getClientsDeFacture(shopId: string): Promise<ClientDeFacture[]> {
  const clients: ClientDeFacture[] = []
  // L'API est paginée : ne pas limiter silencieusement le sélecteur aux 25 premiers clients.
  for (let page = 1; ; page++) {
    const result = await api<{ items: Customer[]; total: number }>(`/customers?shopId=${encodeURIComponent(shopId)}&page=${page}&pageSize=100`)
    clients.push(...result.items.filter(c => c.active).map(c => ({ id: c.id, nom: c.name, nif: c.nif ?? "", stat: c.stat ?? "", adresse: c.address ?? "", telephone: c.phone ?? "" })))
    if (page * 100 >= result.total || !result.items.length) return clients
  }
}
export async function creerFactureClient(s: SaisieDeFactureClient): Promise<FactureClientCreee> {
  const invoice = await api<{ id: string; number: string }>("/customer-invoices", "POST", {
    saleOperationId: s.venteId, invoiceDate: s.dateDeFacture, customerId: s.clientId || undefined,
    customerName: s.clientNom, customerNif: s.nif, customerStat: s.stat, customerAddress: s.adresse, customerPhone: s.telephone, paymentTerms: s.conditions,
  })
  invalidateApi()
  return { id: invoice.id, numero: invoice.number }
}
