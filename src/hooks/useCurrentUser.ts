import { getCurrentUser } from "@/services/backend-api"
import { useApiData } from "./useApiData"
export function useCurrentUser() { return useApiData("current-user", getCurrentUser) }
