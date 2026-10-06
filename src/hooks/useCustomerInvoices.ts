import { getClientsDeFacture, creerFactureClient } from "@/services/customer-invoices-api"
import { useApiData } from "./useApiData"

export function useClientsDeFacture(magasinId?: string) {
  return useApiData(`invoice-customers:${magasinId}`, () => magasinId ? getClientsDeFacture(magasinId) : Promise.resolve(undefined))
}
export const useCreerFactureClient = () => creerFactureClient
export function useProchainNumeroDeFacture(magasinId?: string) {
  // La séquence transactionnelle attribue le numéro à l'émission, sans réservation fictive.
  return useApiData(`invoice-number:${magasinId}`, () => Promise.resolve<string | null>(null))
}
