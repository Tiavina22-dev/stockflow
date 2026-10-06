-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK');

-- CreateEnum
CREATE TYPE "FinanceKind" AS ENUM ('EXPENSE', 'REMITTANCE', 'SUPPLIER_INVOICE');

-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "customerId" UUID,
ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "paymentMethod" "PaymentMethod";

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "nif" TEXT,
    "stat" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceOperation" (
    "id" UUID NOT NULL,
    "kind" "FinanceKind" NOT NULL,
    "number" TEXT NOT NULL,
    "shopId" UUID NOT NULL,
    "businessDate" TIMESTAMPTZ(3) NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyLabel" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "note" TEXT,
    "reason" TEXT,
    "createdById" UUID NOT NULL,
    "validatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "requestKey" UUID NOT NULL,
    "requestHash" TEXT NOT NULL,
    "periodFrom" TIMESTAMPTZ(3),
    "periodTo" TIMESTAMPTZ(3),
    "expectedAmount" DECIMAL(18,2),
    "difference" DECIMAL(18,2),
    "snapshot" JSONB,
    "supplierName" TEXT,
    "supplierReference" TEXT,
    "receiptId" UUID,

    CONSTRAINT "FinanceOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoiceLine" (
    "id" UUID NOT NULL,
    "financeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "productReference" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SupplierInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAttachment" (
    "id" UUID NOT NULL,
    "financeId" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaderId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_shopId_name_idx" ON "Customer"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceOperation_number_key" ON "FinanceOperation"("number");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceOperation_requestKey_key" ON "FinanceOperation"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceOperation_receiptId_key" ON "FinanceOperation"("receiptId");

-- CreateIndex
CREATE INDEX "FinanceOperation_shopId_kind_businessDate_status_idx" ON "FinanceOperation"("shopId", "kind", "businessDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoiceLine_financeId_productId_key" ON "SupplierInvoiceLine"("financeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAttachment_location_key" ON "FinanceAttachment"("location");

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "FinanceOperation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "SupplierInvoiceLine_financeId_fkey" FOREIGN KEY ("financeId") REFERENCES "FinanceOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "SupplierInvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_financeId_fkey" FOREIGN KEY ("financeId") REFERENCES "FinanceOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Documents validés conservés ; seules annulation et date d'annulation sont permises.
CREATE FUNCTION stockflow_preserve_finance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Financial documents cannot be deleted'; END IF;
 IF OLD.status <> 'DRAFT' AND (
   OLD.status <> 'VALIDATED' OR NEW.status <> 'CANCELLED' OR NEW."cancelledAt" IS NULL OR
   (to_jsonb(NEW) - 'status' - 'cancelledAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'cancelledAt')
 ) THEN RAISE EXCEPTION 'Validated financial documents are immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_finance BEFORE UPDATE OR DELETE ON "FinanceOperation" FOR EACH ROW EXECUTE FUNCTION stockflow_preserve_finance();
CREATE FUNCTION stockflow_preserve_supplier_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status "OperationStatus";
BEGIN
 SELECT status INTO parent_status FROM "FinanceOperation" WHERE id=CASE WHEN TG_OP='INSERT' THEN NEW."financeId" ELSE OLD."financeId" END FOR UPDATE;
 IF parent_status <> 'DRAFT' THEN RAISE EXCEPTION 'Supplier lines are immutable after validation'; END IF;
 IF TG_OP='UPDATE' AND NEW."financeId" <> OLD."financeId" THEN RAISE EXCEPTION 'Cannot move supplier lines'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_supplier_line BEFORE INSERT OR UPDATE OR DELETE ON "SupplierInvoiceLine" FOR EACH ROW EXECUTE FUNCTION stockflow_preserve_supplier_line();
CREATE TRIGGER immutable_finance_attachment BEFORE UPDATE OR DELETE ON "FinanceAttachment" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "Finance_amount_nonnegative" CHECK ("amount" >= 0);
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "Supplier_line_values" CHECK (quantity > 0 AND "unitPrice" >= 0 AND total >= 0);
ALTER TABLE "FinanceOperation" ADD CONSTRAINT "Finance_kind_fields" CHECK (
 (kind='EXPENSE' AND amount>0 AND length(trim(reason))>0 AND "paymentMethod" IS NOT NULL AND "periodFrom" IS NULL AND "receiptId" IS NULL) OR
 (kind='REMITTANCE' AND "paymentMethod"='CASH' AND "periodFrom" IS NOT NULL AND "periodTo">="periodFrom" AND "receiptId" IS NULL) OR
 (kind='SUPPLIER_INVOICE' AND length(trim("supplierName"))>0 AND length(trim("supplierReference"))>0 AND "periodFrom" IS NULL)
);
CREATE UNIQUE INDEX "Supplier_document_reference_unique" ON "FinanceOperation" ("shopId",lower(trim("supplierName")),trim("supplierReference")) WHERE kind='SUPPLIER_INVOICE' AND status <> 'CANCELLED';
CREATE INDEX "AuditEvent_shop_date_idx" ON "AuditEvent" ("shopId","createdAt",id);
CREATE INDEX "AuditEvent_actor_date_idx" ON "AuditEvent" ("actorId","createdAt");
