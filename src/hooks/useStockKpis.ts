import { useCallback } from "react"
import { getStockKpis } from "@/services/demo-api"
import { useAsyncData } from "./useAsyncData"
export function useStockKpis(storeId: string | undefined) {
  const load = useCallback(() => getStockKpis(storeId), [storeId])
  return useAsyncData(JSON.stringify([storeId]), load)
}
