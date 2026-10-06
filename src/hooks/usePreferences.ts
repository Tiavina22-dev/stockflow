import { useApiData } from "./useApiData"
import { getPreferences } from "@/services/preferences-api"
export function usePreferences() { return useApiData("preferences", getPreferences) }
