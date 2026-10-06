import { getStores } from "@/services/backend-api"
import { useApiData } from "./useApiData"
export function useStores() { return useApiData("stores", getStores) }
