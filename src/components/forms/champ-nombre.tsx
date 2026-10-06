import type { ComponentProps, Ref } from "react"
import { NumericFormat } from "react-number-format"

import { Input } from "@/components/ui/input"

type ChampNombreProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "defaultValue"> & {
  /** Valeur brute sans espaces, point décimal (« 35000 », « 2.5 ») ; "" = vide */
  valeur: string | number | null
  /** Reçoit la valeur brute (« 35000 », « 2.5 », "" si vide) */
  onChange: (valeur: string) => void
  /** Nombre de décimales autorisées (0 = entier, ex. montants en Ar) */
  decimales?: number
  /** Champ natif sans habillage (cellules modifiables d'un tableau) */
  natif?: boolean
  getInputRef?: Ref<HTMLInputElement>
}

/**
 * Champ numérique avec espace des milliers automatique pendant la saisie (« 35 000 »),
 * virgule ou point acceptés pour les décimales si `decimales` > 0. Bibliothèque : react-number-format.
 */
export function ChampNombre({ valeur, onChange, decimales = 0, natif = false, ...props }: ChampNombreProps) {
  return (
    <NumericFormat
      {...props}
      customInput={natif ? undefined : Input}
      value={valeur ?? ""}
      valueIsNumericString={typeof valeur === "string"}
      thousandSeparator=" "
      decimalSeparator=","
      allowedDecimalSeparators={[",", "."]}
      decimalScale={decimales}
      allowNegative={false}
      inputMode={decimales > 0 ? "decimal" : "numeric"}
      // Seules les frappes remontent (pas les mises à jour venues de `valeur`)
      onValueChange={(v, info) => info.source === "event" && onChange(v.value)}
    />
  )
}
