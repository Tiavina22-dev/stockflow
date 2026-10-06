import { cacheLifetime, queryCache, requestCache } from "./data-cache"

const base = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001/api/v1").replace(/\/$/, "")
const sessionKey = "stockflow.session"
type Session = { token: string; expires: number }
let current: Session | undefined
let checked = false
let checking: Promise<void> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let version = 0
const listeners = new Set<() => void>()
const sessionListeners = new Set<() => void>()
export function subscribeApi(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function apiVersion() { return version }
export function invalidateApi(reset = false) {
  requestCache.clear()
  if (reset) queryCache.clear(); else queryCache.invalidate()
  version++; listeners.forEach(listener => listener())
}
export function subscribeSession(listener: () => void) { sessionListeners.add(listener); return () => { sessionListeners.delete(listener) } }
export function sessionStatus() { return !checked ? "checking" : current ? "authenticated" : "anonymous" }
function notifySession() { sessionListeners.forEach(listener => listener()) }
function persist() {
  try { if (current) sessionStorage.setItem(sessionKey, JSON.stringify(current)); else sessionStorage.removeItem(sessionKey) } catch { /* Memory session when browser storage is unavailable. */ }
  clearTimeout(timer)
  if (current) timer = setTimeout(clearSession, Math.max(0, current.expires - Date.now()))
}
export function setSession(accessToken: string, expiresIn: number) {
  current = { token: accessToken, expires: Date.now() + expiresIn * 1000 }; checked = true
  persist(); notifySession(); invalidateApi(true)
}
export function clearSession() {
  current = undefined; checked = true
  persist(); notifySession(); invalidateApi(true)
}
async function responseJson(response: Response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : Array.isArray(data?.message) ? data.message.join(" · ") : response.status === 401 ? "Connectez-vous pour accéder aux données." : `L’API a refusé la requête (${response.status}).`)
  return data
}
export async function publicApi<T>(path: string, body: unknown): Promise<T> {
  return responseJson(await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) }))
}
export async function login(login: string, password: string) {
  const result = await publicApi<{ accessToken: string; expiresIn: number }>("/auth/login", { login, password })
  setSession(result.accessToken, result.expiresIn)
}
export async function verifySession() {
  if (checked) return
  if (!checking) checking = (async () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) ?? "null") as Session | null
      if (!saved || typeof saved.token !== "string" || !Number.isFinite(saved.expires) || saved.expires <= Date.now()) { clearSession(); return }
      current = saved
      const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${saved.token}` }, signal: AbortSignal.timeout(20000) })
      if (response.status === 401) { if (current?.token === saved.token) clearSession(); return }
      await responseJson(response); checked = true; persist(); notifySession()
    } catch { current = undefined; checked = true; notifySession() }
  })().finally(() => { checking = undefined })
  await checking
}
function session() {
  if (!current || Date.now() >= current.expires) { clearSession(); throw new Error("Connectez-vous pour accéder au backend.") }
  return current.token
}
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  try {
    const token = session()
    const request = async (): Promise<T> => {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
      if (!(body instanceof FormData) && body !== undefined) headers["Content-Type"] = "application/json"
      const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(20000) })
      if (response.status === 401 && current?.token === token) clearSession()
      return responseJson(response)
    }
    if (method === "GET" && body === undefined) return structuredClone(await requestCache.read(path, request, cacheLifetime(path)))
    return await request()
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && error.name === "TimeoutError")) throw new Error("Backend inaccessible. Vérifiez que l’API locale est démarrée.")
    throw error
  }
}
export async function logout() {
  try { await api("/auth/logout", "POST") } finally { clearSession() }
}
export async function photoData(path: string): Promise<string> {
  const token = session()
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) { await responseJson(response); throw new Error("Photo indisponible.") }
  const blob = await response.blob()
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob) })
}
export async function download(path: string, filename: string) {
  const token = session()
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) })
  if (response.status === 401 && current?.token === token) clearSession()
  if (!response.ok) { await responseJson(response); return }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
