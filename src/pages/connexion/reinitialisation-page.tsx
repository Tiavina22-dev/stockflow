import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { publicApi } from "@/services/http-api"
import { t, tr } from "@/i18n"
export function ReinitialisationPage() {
 const [token] = useState(() => new URLSearchParams(window.location.search).get("token"))
 useEffect(() => { if (token) window.history.replaceState(null, "", "/reinitialisation") }, [token])
 const [password,setPassword]=useState("")
 const [confirmation,setConfirmation]=useState("")
 const [message,setMessage]=useState("")
 const [busy,setBusy]=useState(false)
 const [done,setDone]=useState(false)
 return <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6">
  <h1 className="text-2xl font-bold">{t("Réinitialiser le mot de passe")}</h1>
  {!token ? <p className="text-sm">{t("Demandez un lien de réinitialisation à votre administrateur. Il peut le créer depuis Utilisateurs. Le lien reste valable 30 minutes.")}</p> : done ? <p role="status">{t("Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.")}</p> : <form className="flex flex-col gap-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try {await publicApi("/auth/reset-password",{token,password});setDone(true)} catch(error){setMessage(error instanceof Error?error.message:"Réinitialisation impossible.")}finally{setBusy(false)}}}>
   <label className="text-sm">{t("Nouveau mot de passe (12 caractères minimum)")}<Input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} /></label>
   <label className="text-sm">{t("Confirmer le mot de passe")}<Input type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label>
   {message&&<p role="alert" className="text-sm text-destructive">{tr(message)}</p>}
   <Button disabled={busy||password.length<12||password!==confirmation} type="submit">{busy?t("Enregistrement…"):t("Changer le mot de passe")}</Button>
  </form>}
  <Button variant="outline" render={<a href="/connexion"/>}>{t("Retour à la connexion")}</Button>
 </main>
}
