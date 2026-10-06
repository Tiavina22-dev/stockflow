import { useEffect, useState } from "react"
import type { AsyncState } from "@/types"

export function useAsyncData<T>(key: string, load: () => Promise<T>): AsyncState<T> {
  const [result, setResult] = useState<{ key: string; state: AsyncState<T> }>()
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(load).then(
      data => { if (!cancelled) setResult({ key, state: { data, isLoading: false, error: null } }) },
      error => { if (!cancelled) setResult({ key, state: { data: undefined, isLoading: false, error: error instanceof Error ? error.message : "Impossible de charger les données." } }) },
    )
    return () => { cancelled = true }
  }, [key, load])
  return result?.key === key ? result.state : { data: undefined, isLoading: true, error: null }
}
