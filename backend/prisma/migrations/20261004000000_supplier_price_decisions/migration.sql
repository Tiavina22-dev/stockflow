-- Une décision définitive par ligne. Le journal est déjà immuable et centralisé.
CREATE UNIQUE INDEX "AuditEvent_supplier_price_decision_unique"
ON "AuditEvent" ("entityId")
WHERE "action" = 'supplier-price.decide' AND "entityType" = 'SupplierInvoiceLine';
