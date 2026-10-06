-- CreateEnum
CREATE TYPE "StockOutPurpose" AS ENUM ('GENERAL', 'INTERNAL_CONSUMPTION');

-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "currencyLabel" TEXT NOT NULL DEFAULT 'Ar',
ADD COLUMN     "stockOutPurpose" "StockOutPurpose";

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "name" TEXT NOT NULL DEFAULT 'StockFlow',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "nif" TEXT NOT NULL DEFAULT '',
    "stat" TEXT NOT NULL DEFAULT '',
    "rcs" TEXT NOT NULL DEFAULT '',
    "currencyLabel" TEXT NOT NULL DEFAULT 'Ar',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 20,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInvoice" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "saleOperationId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "issuedById" UUID NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalInvoiceId" UUID,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_number_key" ON "CustomerInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_saleOperationId_key" ON "CustomerInvoice"("saleOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_originalInvoiceId_key" ON "CustomerInvoice"("originalInvoiceId");

-- CreateIndex
CREATE INDEX "CustomerInvoice_shopId_issuedAt_idx" ON "CustomerInvoice"("shopId", "issuedAt");

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_saleOperationId_fkey" FOREIGN KEY ("saleOperationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationLine" DROP CONSTRAINT "OperationLine_quantity_positive";
ALTER TABLE "OperationLine" ADD CONSTRAINT "OperationLine_quantity_nonnegative" CHECK ("quantity" >= 0);
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_taxRate_allowed" CHECK ("taxRate" IN (5,20));
CREATE FUNCTION stockflow_reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Historical records are immutable'; END;
$$;
CREATE TRIGGER immutable_invoice BEFORE UPDATE OR DELETE ON "CustomerInvoice" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
CREATE TRIGGER immutable_movement BEFORE UPDATE OR DELETE ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
