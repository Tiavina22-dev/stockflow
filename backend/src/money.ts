import { Prisma } from '@prisma/client';

export function formatAmount(value: Prisma.Decimal.Value, currency = 'Ar'): string {
  const fixed = new Prisma.Decimal(value).toFixed(2, Prisma.Decimal.ROUND_HALF_UP);
  const negative = fixed.startsWith('-');
  const [whole, cents] = (negative ? fixed.slice(1) : fixed).split('.');
  const grouped = new Intl.NumberFormat('fr-FR').format(BigInt(whole));
  return `${negative ? '−' : ''}${grouped},${cents} ${currency}`;
}

export function invoiceTotals(totalTtc: Prisma.Decimal.Value, taxRate: Prisma.Decimal.Value) {
  const total = new Prisma.Decimal(totalTtc).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const rate = new Prisma.Decimal(taxRate);
  const totalHt = total.div(new Prisma.Decimal(1).add(rate.div(100))).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { totalTtc: total.toFixed(2), totalHt: totalHt.toFixed(2), taxAmount: total.sub(totalHt).toFixed(2), taxRate: rate.toFixed(2), hideTaxOnPrint: rate.equals(5) };
}
