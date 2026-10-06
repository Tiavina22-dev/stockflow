import { useCallback } from "react"
import { getProducts, type ProductsParams } from "@/services/demo-api"
import { useAsyncData } from "./useAsyncData"
export function useProducts({ storeId, search = "", page, pageSize }: ProductsParams) {
  const load = useCallback(() => getProducts({ storeId, search, page, pageSize }), [storeId, search, page, pageSize])
  return useAsyncData(JSON.stringify([storeId, search, page, pageSize]), load)
}
