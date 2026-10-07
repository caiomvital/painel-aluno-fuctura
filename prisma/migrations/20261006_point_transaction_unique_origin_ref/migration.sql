-- Disambiguate any existing duplicate originReferences prior to creating unique constraint
UPDATE "PointTransaction"
SET "originReference" = "originReference" || '_' || "id"
WHERE "originReference" = 'ADMIN_user_director_1';

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_studentId_originReference_key" ON "PointTransaction"("studentId", "originReference");
