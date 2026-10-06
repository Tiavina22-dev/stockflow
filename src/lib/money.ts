const amount = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const money = { format: (value: number) => `${amount.format(value)} Ar` }
