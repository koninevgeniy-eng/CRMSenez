CREATE TABLE "ReferenceDictionary" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReferenceItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dictionaryId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferenceItem_dictionaryId_fkey" FOREIGN KEY ("dictionaryId") REFERENCES "ReferenceDictionary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferenceDictionary_code_key" ON "ReferenceDictionary"("code");
CREATE UNIQUE INDEX "ReferenceItem_dictionaryId_value_key" ON "ReferenceItem"("dictionaryId", "value");
CREATE INDEX "ReferenceItem_dictionaryId_isActive_idx" ON "ReferenceItem"("dictionaryId", "isActive");

INSERT INTO "ReferenceDictionary" ("id", "code", "name", "description", "isSystem") VALUES
  ('dict_event_types', 'event_types', 'Типы мероприятий', 'Классификация мероприятий для карточек и аналитики', true),
  ('dict_venues', 'venues', 'Площадки', 'Площадки проведения мероприятий', true),
  ('dict_campuses', 'campuses', 'Кампусы', 'Кампусы и территории проведения', true),
  ('dict_funding_sources', 'funding_sources', 'Источники финансирования', 'Источники финансирования бюджета мероприятия', true),
  ('dict_event_formats', 'event_formats', 'Форматы мероприятий', 'Формат участия и проведения мероприятия', true);

INSERT INTO "ReferenceItem" ("id", "dictionaryId", "value", "label", "sortOrder", "createdBy") VALUES
  ('item_event_type_education', 'dict_event_types', 'Образовательная программа', 'Образовательная программа', 10, 'migration'),
  ('item_event_type_module', 'dict_event_types', 'Модульная программа', 'Модульная программа', 20, 'migration'),
  ('item_event_type_forum', 'dict_event_types', 'Форум', 'Форум', 30, 'migration'),
  ('item_event_type_seminar', 'dict_event_types', 'Семинар', 'Семинар', 40, 'migration'),
  ('item_event_type_post', 'dict_event_types', 'Постсопровождение', 'Постсопровождение', 50, 'migration'),
  ('item_venue_senez', 'dict_venues', 'Сенеж', 'Сенеж', 10, 'migration'),
  ('item_venue_techno', 'dict_venues', 'ТехноСенеж', 'ТехноСенеж', 20, 'migration'),
  ('item_venue_conference', 'dict_venues', 'Конференц-зал', 'Конференц-зал', 30, 'migration'),
  ('item_venue_external', 'dict_venues', 'Выездная площадка', 'Выездная площадка', 40, 'migration'),
  ('item_campus_south', 'dict_campuses', 'Южный', 'Южный', 10, 'migration'),
  ('item_campus_north', 'dict_campuses', 'Северный', 'Северный', 20, 'migration'),
  ('item_funding_education', 'dict_funding_sources', 'Образовательная субсидия', 'Образовательная субсидия', 10, 'migration'),
  ('item_funding_vg', 'dict_funding_sources', 'Субсидия ВГ', 'Субсидия ВГ', 20, 'migration'),
  ('item_funding_extra', 'dict_funding_sources', 'Внебюджет', 'Внебюджет', 30, 'migration'),
  ('item_funding_business', 'dict_funding_sources', 'Предпринимательская деятельность', 'Предпринимательская деятельность', 40, 'migration'),
  ('item_format_offline', 'dict_event_formats', 'Очный', 'Очный', 10, 'migration'),
  ('item_format_online', 'dict_event_formats', 'Онлайн', 'Онлайн', 20, 'migration'),
  ('item_format_hybrid', 'dict_event_formats', 'Гибридный', 'Гибридный', 30, 'migration');
