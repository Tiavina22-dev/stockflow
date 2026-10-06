import { api } from "./http-api"
import type { ParametresDuStock, ParametresDeVente } from "@/types"
export const getPreferences = () => api<{ stock: ParametresDuStock; ventes: ParametresDeVente }>("/preferences")
