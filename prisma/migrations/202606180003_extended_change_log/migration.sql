ALTER TABLE "ChangeLog" ADD COLUMN "role" TEXT;
ALTER TABLE "ChangeLog" ADD COLUMN "department" TEXT;
ALTER TABLE "ChangeLog" ADD COLUMN "stage" TEXT;
ALTER TABLE "ChangeLog" ADD COLUMN "version" INTEGER;
ALTER TABLE "ChangeLog" ADD COLUMN "comment" TEXT;

CREATE INDEX "ChangeLog_eventId_createdAt_idx" ON "ChangeLog"("eventId", "createdAt");
CREATE INDEX "ChangeLog_stage_idx" ON "ChangeLog"("stage");
