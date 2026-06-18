-- Stage 1 process model: event owner, archive/cancel metadata, and approval decisions.

ALTER TABLE "Event" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Event" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Event" ADD COLUMN "cancelRequestedAt" DATETIME;
ALTER TABLE "Event" ADD COLUMN "cancelRequestedBy" TEXT;
ALTER TABLE "Event" ADD COLUMN "cancelReason" TEXT;

CREATE TABLE "EventApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "decidedBy" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventApproval_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EventApproval_eventId_createdAt_idx" ON "EventApproval"("eventId", "createdAt");
CREATE INDEX "EventApproval_stage_decision_idx" ON "EventApproval"("stage", "decision");
