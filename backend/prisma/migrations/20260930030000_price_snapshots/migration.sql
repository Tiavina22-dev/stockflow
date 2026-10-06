ALTER TABLE "Operation" ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 20;
ALTER TABLE "OperationLine" ADD COLUMN "expectedUnitPrice" DECIMAL(18,2);
CREATE TABLE "ProductPrice" (
  "productId" UUID NOT NULL, "shopId" UUID NOT NULL, "price" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("productId", "shopId"),
  CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductPrice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
