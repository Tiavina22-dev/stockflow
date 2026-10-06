import { useEffect, useSyncExternalStore } from "react"
import { logout, sessionStatus, subscribeSession, verifySession } from "@/services/http-api"
export function useSession() {
 const status = useSyncExternalStore(subscribeSession, sessionStatus)
 useEffect(() => { void verifySession() }, [])
 return { connecte: status === "authenticated", enChargement: status === "checking" }
}
export function useDeconnexion() { return logout }
