CREATE TABLE "CustomFieldDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL DEFAULT 'event',
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "fieldType" TEXT NOT NULL DEFAULT 'text',
  "options" TEXT,
  "department" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "showInAnalytics" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CustomFieldValue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "fieldId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "valueNumber" REAL,
  "valueDate" DATETIME,
  "valueBoolean" BOOLEAN,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CustomFieldValue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomFieldDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CustomFieldDefinition_entityType_key_key" ON "CustomFieldDefinition"("entityType", "key");
CREATE INDEX "CustomFieldDefinition_entityType_isActive_idx" ON "CustomFieldDefinition"("entityType", "isActive");
CREATE INDEX "CustomFieldDefinition_department_idx" ON "CustomFieldDefinition"("department");
CREATE UNIQUE INDEX "CustomFieldValue_eventId_fieldId_key" ON "CustomFieldValue"("eventId", "fieldId");
CREATE INDEX "CustomFieldValue_fieldId_value_idx" ON "CustomFieldValue"("fieldId", "value");
CREATE INDEX "CustomFieldValue_fieldId_valueNumber_idx" ON "CustomFieldValue"("fieldId", "valueNumber");
CREATE INDEX "CustomFieldValue_fieldId_valueDate_idx" ON "CustomFieldValue"("fieldId", "valueDate");
