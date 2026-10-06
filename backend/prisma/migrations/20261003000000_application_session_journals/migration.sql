ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "lastActiveAt" TIMESTAMPTZ(3);
ALTER TABLE "Shop" ADD COLUMN "email" TEXT, ADD COLUMN "managerName" TEXT;
ALTER TABLE "Category" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Unit" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Brand" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "Shop_single_main" ON "Shop" ("isMain") WHERE "isMain" = true;
CREATE TABLE "UserPermission" (
 "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "permissionId" UUID NOT NULL REFERENCES "Permission"("id") ON DELETE RESTRICT,
 "allowed" BOOLEAN NOT NULL,
 PRIMARY KEY ("userId","permissionId")
);
CREATE TABLE "PasswordResetToken" (
 "id" UUID PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE,
 "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "usedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken" ("userId","expiresAt");
CREATE TABLE "ApplicationSettings" ("id" TEXT PRIMARY KEY, "values" JSONB NOT NULL);
CREATE TABLE "CashJournal" (
 "id" UUID PRIMARY KEY,
 "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE RESTRICT,
 "createdById" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "businessDate" TIMESTAMPTZ(3) NOT NULL,
 "status" "OperationStatus" NOT NULL DEFAULT 'DRAFT',
 "requestKey" UUID NOT NULL UNIQUE,"requestHash" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"validatedAt" TIMESTAMPTZ(3)
);
CREATE INDEX "CashJournal_shopId_businessDate_status_idx" ON "CashJournal" ("shopId","businessDate","status");
CREATE TABLE "CashJournalAttachment" (
 "id" UUID PRIMARY KEY,
 "journalId" UUID NOT NULL REFERENCES "CashJournal"("id") ON DELETE RESTRICT,
 "originalName" TEXT NOT NULL,"location" TEXT NOT NULL UNIQUE,"mimeType" TEXT NOT NULL,"size" INTEGER NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Operation" ADD COLUMN "journalId" UUID REFERENCES "CashJournal"("id") ON DELETE RESTRICT;
ALTER TABLE "FinanceOperation" ADD COLUMN "journalId" UUID REFERENCES "CashJournal"("id") ON DELETE RESTRICT;
CREATE FUNCTION protect_cash_journal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' OR OLD.status <> 'DRAFT' THEN RAISE EXCEPTION 'Cash journal is retained and immutable after validation'; END IF;
 IF NEW."shopId" <> OLD."shopId" OR NEW."createdById" <> OLD."createdById" OR NEW."requestKey" <> OLD."requestKey" OR NEW."requestHash" <> OLD."requestHash" OR NEW."businessDate" <> OLD."businessDate" THEN RAISE EXCEPTION 'Cash journal identity is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "CashJournal_protect" BEFORE UPDATE OR DELETE ON "CashJournal" FOR EACH ROW EXECUTE FUNCTION protect_cash_journal();
CREATE FUNCTION protect_cash_attachment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Cash journal attachments are retained'; END $$;
CREATE TRIGGER "CashJournalAttachment_protect" BEFORE UPDATE OR DELETE ON "CashJournalAttachment" FOR EACH ROW EXECUTE FUNCTION protect_cash_attachment();
