ALTER TABLE "Operation" ADD COLUMN "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "superseded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requestKey" UUID;
CREATE UNIQUE INDEX "Operation_requestKey_key" ON "Operation"("requestKey");
ALTER TABLE "OperationLine" ADD COLUMN "reason" TEXT;
CREATE TABLE "StockSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "allowNegativeStock" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "StockSettings_pkey" PRIMARY KEY ("id")
);
