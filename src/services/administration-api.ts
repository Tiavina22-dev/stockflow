import type { FiltresDesUtilisateurs, UtilisateurSaisi, RoleUtilisateur, Permissions, StatutUtilisateur, LigneDUtilisateur, ResumeDesUtilisateurs, FiltresDesMagasins, MagasinDetaille, MagasinSaisi, TypeDElementDeCatalogue, CatalogueDeReference, ParametresDuStock, ParametresDeVente, ParametresDeFacturation } from "@/types"
import { paginate } from "./backend-api"
import { api, invalidateApi, photoData } from "./http-api"
type Role = { id: string; code: string; name: string; permissions: { permission: { code: string } }[] }
type Account = { id: string; name: string; login: string; email: string | null; phone: string | null; photoUrl: string | null; active: boolean; roleId: string; role: Role; primaryShopId: string | null; shops: { shopId: string }[]; permissionOverrides: { allowed: boolean; permission: { code: string } }[]; lastActiveAt: string | null }
type Shop = { id: string; name: string; code: string; managerName: string | null; phone: string | null; email: string | null; address: string | null; isMain: boolean; active: boolean }
const roleLabels: Record<string, RoleUtilisateur> = { ADMIN: "Administrateur", RESPONSABLE: "Responsable", GESTIONNAIRE_STOCK: "Gestionnaire de stock", VENDEUR: "Vendeur", COMPTABLE: "Comptabilité", RESPONSABLE_SAISIE: "Responsable de saisie" }
const permissionMap: Record<string, Record<string, string>> = { ventes: { creer: "sales.create", consulter: "sales.read", annuler: "sales.cancel" }, stock: { consulter: "stock.read", corriger: "stock.adjust", transferer: "stock.transfer" }, produits: { consulter: "products.read", modifier: "products.update", creer: "products.create" }, rapports: { consulter: "reports.read", exporter: "reports.export" } }
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
function codes(u: Account) { const p = new Set(u.role.permissions.map(p => p.permission.code)); for (const o of u.permissionOverrides) { if (o.allowed) p.add(o.permission.code); else p.delete(o.permission.code) } return p }
function permissions(u: Account): Permissions { const c = codes(u); return Object.fromEntries(Object.entries(permissionMap).map(([module, actions]) => [module, Object.entries(actions).filter(([, code]) => c.has(code)).map(([action]) => action)])) as Permissions }
function label(u: Account) { const role = roleLabels[u.role.code]; if (!role) throw new Error(`Rôle inconnu : ${u.role.name}.`); return role }
async function picture(u: Account) { return u.photoUrl ? photoData(`/users/${u.id}/photo`).catch(() => undefined) : undefined }
export async function getUsers(f: FiltresDesUtilisateurs) {
 const [users, shops] = await Promise.all([api<Account[]>("/users"), api<Shop[]>("/shops")])
 const rows = users.filter(u => (!f.role || label(u) === f.role) && (!f.statut || u.active === (f.statut === "Actif")) && (!f.magasinId || codes(u).has("shops.all") || u.shops.some(s => s.shopId === f.magasinId)))
  .map(u => { const all = codes(u).has("shops.all"); const magasinNom = all ? "Tous les magasins" : shops.filter(s => u.shops.some(x => x.shopId === s.id)).map(s => s.name).join(", ") || "Aucun magasin"; return { u, row: { id: u.id, nom: u.name, email: u.email ?? "", role: label(u), magasinNom, statut: u.active ? "Actif" : "Inactif", derniereActivite: u.lastActiveAt, resumePermissions: Object.entries(permissions(u)).filter(([, v]) => v.length).map(([m]) => m).join(", ") } as LigneDUtilisateur } })
  .filter(({ row }) => normal([row.nom, row.email, row.role, row.magasinNom].join(" ")).includes(normal(f.recherche)))
 const p = paginate(rows, f.page, f.pageSize)
 return { ...p, items: await Promise.all(p.items.map(async ({ row, u }) => ({ ...row, photoUrl: await picture(u) }))) }
}
export async function getUserSummary(): Promise<ResumeDesUtilisateurs> {
 const [users, shops] = await Promise.all([api<Account[]>("/users"), api<Shop[]>("/shops")]); const active = users.filter(u => u.active)
 return { utilisateursActifs: active.length, utilisateursActifsDetail: "Comptes autorisés à se connecter", administrateurs: active.filter(u => u.role.code === "ADMIN").length, administrateursDetail: "Administrateurs actifs", magasinsCouverts: shops.filter(s => s.active && active.some(u => codes(u).has("shops.all") || u.shops.some(x => x.shopId === s.id))).length, magasinsCouvertsDetail: "Magasins actifs avec un utilisateur", comptesInactifs: users.length - active.length, comptesInactifsDetail: "Connexion refusée" }
}
export async function getUser(id: string): Promise<UtilisateurSaisi> {
 const u = await api<Account>(`/users/${id}`)
 return { utilisateurId: u.id, nomComplet: u.name, email: u.email ?? "", telephone: u.phone ?? "", identifiant: u.login, role: label(u), magasinId: codes(u).has("shops.all") ? null : u.primaryShopId ?? u.shops[0]?.shopId ?? null, motDePasse: "", statut: u.active ? "Actif" : "Inactif", permissions: permissions(u), photo: null, photoUrl: await picture(u) }
}
export async function saveUser(u: UtilisateurSaisi) {
 if (u.motDePasse && u.motDePasse.length < 12) throw new Error("Le mot de passe doit contenir au moins 12 caractères.")
 const roles = await api<Role[]>("/roles"), role = roles.find(r => roleLabels[r.code] === u.role)
 if (!role) throw new Error("Ce rôle n’existe pas dans le backend.")
 const permissionCodes = Object.entries(permissionMap).flatMap(([m, actions]) => Object.entries(actions).filter(([a]) => u.permissions[m as keyof Permissions].includes(a as Permissions[keyof Permissions][number])).map(([, c]) => c))
 if (u.magasinId === null) permissionCodes.push("shops.all")
 const body = { name: u.nomComplet, email: u.email || null, phone: u.telephone, login: u.identifiant, roleId: role.id, primaryShopId: u.magasinId, active: u.statut === "Actif", password: u.motDePasse || undefined, permissionCodes }
 const account = await api<{ id: string }>(u.utilisateurId ? `/users/${u.utilisateurId}` : "/users", u.utilisateurId ? "PATCH" : "POST", body)
 u.utilisateurId = account.id
 try { if (u.photo) { const data = new FormData(); data.append("photo", u.photo); await api(`/users/${account.id}/photo`, "POST", data) } } finally { invalidateApi() }
}
export async function changeUserStatus(id: string, status: StatutUtilisateur) { await api(`/users/${id}`, "PATCH", { active: status === "Actif" }); invalidateApi() }
export async function resetUserPassword(id: string) { const result = await api<{ token: string; expiresAt: string }>(`/users/${id}/password-reset`, "POST"); return `${window.location.origin}/reinitialisation?token=${encodeURIComponent(result.token)}` }
type Settings = { stock: ParametresDuStock; ventes: ParametresDeVente; facturation: ParametresDeFacturation }
export const getSettings = <K extends keyof Settings>(rubric: K) => api<Settings[K]>(`/settings/forms/${rubric}`)
export async function saveSettings<K extends keyof Settings>(rubric: K, values: Settings[K]) { await api(`/settings/forms/${rubric}`, "PATCH", values); invalidateApi() }
const referencePath = { categorie: "categories", unite: "units", marque: "brands" }
export async function getReferenceCatalog(): Promise<CatalogueDeReference> {
 type Ref = { id: string; name: string; description: string; active: boolean; _count: { products: number } }
 const load = async (type: TypeDElementDeCatalogue) => (await api<Ref[]>(`/${referencePath[type]}`)).filter(r => r.active).map(r => ({ id: r.id, nom: r.name, description: r.description, nombreDeProduits: r._count.products }))
 const [categories, unites, marques] = await Promise.all([load("categorie"), load("unite"), load("marque")]); return { categories, unites, marques }
}
export async function saveReference(type: TypeDElementDeCatalogue, e: { id?: string; nom: string; description: string }) { await api(`/${referencePath[type]}${e.id ? "/" + e.id : ""}`, e.id ? "PATCH" : "POST", { name: e.nom, description: e.description }); invalidateApi() }
export async function deleteReference(type: TypeDElementDeCatalogue, id: string) { await api(`/${referencePath[type]}/${id}`, "DELETE"); invalidateApi() }
export async function getShops(f: FiltresDesMagasins): Promise<MagasinDetaille[]> {
 return (await api<Shop[]>("/shops")).map(s => ({ id: s.id, nom: s.name, code: s.code, responsable: s.managerName ?? "", telephone: s.phone ?? "", email: s.email ?? "", adresse: s.address ?? "", principal: s.isMain, statut: s.active ? "Actif" : "Inactif" } as MagasinDetaille)).filter(s => (!f.statut || s.statut === f.statut) && normal([s.nom, s.code, s.responsable, s.adresse].join(" ")).includes(normal(f.recherche)))
}
export async function saveShop(s: MagasinSaisi) { await api(`/shops${s.id ? "/" + s.id : ""}`, s.id ? "PATCH" : "POST", { name: s.nom, code: s.code, managerName: s.responsable, phone: s.telephone, email: s.email || null, address: s.adresse, isMain: s.principal, active: s.statut === "Actif" }); invalidateApi() }
export async function deleteShop(id: string) { await api(`/shops/${id}`, "DELETE"); invalidateApi() }
