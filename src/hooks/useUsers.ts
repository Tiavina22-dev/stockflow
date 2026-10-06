import { useApiData } from "./useApiData"
import { getUsers, getUser, getUserSummary, saveUser, changeUserStatus, resetUserPassword } from "@/services/administration-api"
import type { FiltresDesUtilisateurs } from "@/types"
export function useUtilisateurs(f: FiltresDesUtilisateurs) { return useApiData(`users:${JSON.stringify(f)}`, () => getUsers(f)) }
export function useResumeDesUtilisateurs() { return useApiData("users-summary", getUserSummary) }
export function useUtilisateur(id: string | null) { return useApiData(`user:${id}`, () => id ? getUser(id) : Promise.reject(new Error("Choisissez un utilisateur."))) }
export const useEnregistrerUtilisateur = () => saveUser
export const useChangerStatutUtilisateur = () => changeUserStatus
export const useReinitialiserMotDePasse = () => resetUserPassword
