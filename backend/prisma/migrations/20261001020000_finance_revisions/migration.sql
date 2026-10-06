-- DropIndex
DROP INDEX "FinanceOperation_receiptId_key";

-- AlterTable
ALTER TABLE "FinanceOperation" ADD COLUMN     "originalFinanceId" UUID;

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_originalFinanceId_fkey" FOREIGN KEY ("originalFinanceId") REFERENCES "FinanceOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- L'original annulé reste rattaché ; seule une facture effective par réception.
CREATE UNIQUE INDEX "Supplier_receipt_effective_unique" ON "FinanceOperation" ("receiptId") WHERE status <> 'CANCELLED' AND "receiptId" IS NOT NULL;
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "Finance_validation_snapshot" CHECK (status <> 'VALIDATED' OR ("validatedAt" IS NOT NULL AND "validatedById" IS NOT NULL AND snapshot IS NOT NULL));
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "Finance_required_details" CHECK (
 (kind <> 'EXPENSE' OR reason IS NOT NULL) AND
 (kind <> 'SUPPLIER_INVOICE' OR ("supplierName" IS NOT NULL AND "supplierReference" IS NOT NULL)) AND
 (kind <> 'REMITTANCE' OR "periodTo" IS NOT NULL) AND
 (status <> 'VALIDATED' OR kind <> 'REMITTANCE' OR ("expectedAmount" IS NOT NULL AND difference IS NOT NULL))
);
