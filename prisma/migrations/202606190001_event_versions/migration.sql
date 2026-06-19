CREATE TABLE "EventVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "source" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "createdBy" TEXT,
  "role" TEXT,
  "department" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventVersion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EventVersion_eventId_version_key" ON "EventVersion"("eventId", "version");
CREATE INDEX "EventVersion_eventId_createdAt_idx" ON "EventVersion"("eventId", "createdAt");
