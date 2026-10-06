-- Une TVA inconnue n'est ni 0 % ni le taux actuel de l'entreprise.
ALTER TABLE "Operation" ALTER COLUMN "taxRate" DROP NOT NULL;
CREATE TABLE "LegacyImport" (
  "sourceHash" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summary" JSONB NOT NULL
);
CREATE TABLE "LegacyRecord" (
  "id" UUID PRIMARY KEY,
  "sourceHash" TEXT NOT NULL REFERENCES "LegacyImport"("sourceHash") ON DELETE RESTRICT,
  "sourceTable" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "targetId" UUID,
  "classification" TEXT NOT NULL DEFAULT 'ARCHIVE_A_VERIFIER',
  UNIQUE ("sourceHash", "sourceTable", "sourceKey")
);
CREATE INDEX "LegacyRecord_table_idx" ON "LegacyRecord"("sourceHash", "sourceTable", "sourceKey");
CREATE TABLE "LegacyFile" (
  "id" UUID PRIMARY KEY,
  "sourceHash" TEXT NOT NULL REFERENCES "LegacyImport"("sourceHash") ON DELETE RESTRICT,
  "relativePath" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "size" BIGINT NOT NULL,
  "location" TEXT NOT NULL,
  UNIQUE ("sourceHash", "relativePath")
);
CREATE TRIGGER immutable_legacy_record BEFORE UPDATE OR DELETE ON "LegacyRecord" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
CREATE TRIGGER immutable_legacy_file BEFORE UPDATE OR DELETE ON "LegacyFile" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
CREATE TRIGGER immutable_legacy_import BEFORE UPDATE OR DELETE ON "LegacyImport" FOR EACH ROW EXECUTE FUNCTION stockflow_reject_history_mutation();
