import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminUser } from '@/lib/auth-helpers';
import ExcelJS from 'exceljs';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

function getCellValue(cell: ExcelJS.Cell): any {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;
  if ('result' in value) return value.result ?? '';
  if ('text' in value) return value.text ?? '';
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map(part => part.text).join('');
  }
  return String(value);
}

function worksheetToJson(sheet: ExcelJS.Worksheet): any[] {
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(getCellValue(cell)).trim();
  });

  const rows: any[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: Record<string, any> = {};
    let hasValue = false;

    headers.forEach((header, colNumber) => {
      if (!header) return;
      const value = getCellValue(row.getCell(colNumber));
      item[header] = value;
      if (value !== '') hasValue = true;
    });

    if (hasValue) rows.push(item);
  });
  return rows;
}

function mapStatus(excelStatus: string): string {
  if (!excelStatus) return 'draft';
  const s = String(excelStatus).trim().toLowerCase();
  if (s.includes('заверш')) return 'archived';
  if (s.includes('процесс')) return 'in_progress';
  if (s.includes('запланирован')) return 'methodology_review';
  if (s.includes('согласовано') && !s.includes('на')) return 'calendar_approved';
  if (s.includes('отклон')) return 'revision_requested';
  if (s.includes('отмен')) return 'cancelled';
  return 'draft';
}

function parseExcelDate(val: any): Date | null {
  if (!val || val === '') return null;
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'string') {
    const match = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
      const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function findUserByName(searchName: string) {
  if (!searchName) return null;
  const s = searchName.trim().toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
  
  const users = await db.user.findMany({ where: { isActive: true } });
  
  // Exact match
  let match = users.find(u => u.name.toLowerCase() === s);
  if (match) return match;
  
  // Last name match
  match = users.find(u => {
    const lastName = u.name.toLowerCase().split(' ')[0];
    return s.includes(lastName);
  });
  return match;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getAdminUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Недостаточно прав для импорта. Требуется роль администратора.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    const results: any[] = [];
    const errors: string[] = [];
    let assignmentsCreated = 0;
    
    // Run all imports inside a transaction for data integrity
    await db.$transaction(async (tx) => {
      for (const sheet of workbook.worksheets) {
        const data = worksheetToJson(sheet);
        
        for (const row of data as any[]) {
          try {
            // Support multiple column name formats
            const title = row['Название'] || row['Наименование мероприятия'] || row['title'] || '';
            if (!title || String(title).trim() === '') continue;

            const eventNumber = parseInt(row['№'] || row['number'] || '0');
            
            // Check for duplicate by number
            if (eventNumber) {
              const existing = await tx.event.findFirst({ where: { number: eventNumber } });
              if (existing) {
                errors.push(`Мероприятие #${eventNumber} уже существует: ${existing.title}`);
                continue;
              }
            }

            const status = mapStatus(row['Статус'] || row['status'] || '');
            const startDate = parseExcelDate(row['Дата начала'] || row['startDate']);
            const endDate = parseExcelDate(row['Дата окончания'] || row['endDate']);

            const eventData: any = {
              title: String(title).trim(),
              status,
              number: eventNumber || null,
              client: String(row['Заказчик'] || row['client'] || '').trim() || null,
              programClass: String(row['Класс'] || row['programClass'] || '').trim() || null,
              quarter: String(row['Квартал'] || row['quarter'] || '').trim() || null,
              startDate,
              endDate,
              plannedDates: String(row['Плановые даты'] || row['plannedDates'] || '').trim() || null,
              programType: String(row['Тип программы'] || row['programType'] || '').trim() || null,
              programDirector: String(row['Руководитель программы'] || row['programDirector'] || '').trim() || null,
              coOrganizer: String(row['Соорганизатор'] || row['coOrganizer'] || '').trim() || null,
              finance: String(row['Финансирование'] || row['finance'] || '').trim() || null,
              customerName: String(row['Заказчик'] || row['customerName'] || '').trim() || null,
              fundingSource: String(row['Источник финансирования'] || row['fundingSource'] || '').trim() || null,
              venue: String(row['Площадка'] || row['venue'] || '').trim() || null,
              campus: String(row['Кампус'] || row['campus'] || '').trim() || null,
              budget: parseFloat(row['Бюджет'] || row['budget'] || 0) || null,
              participantCount: parseInt(row['Количество участников'] || row['participantCount'] || 0) || null,
              targetAudience: String(row['Целевая аудитория'] || row['targetAudience'] || '').trim() || null,
              hasProgram: status !== 'draft',
              hasPlan: status !== 'draft',
              notifications: {
                create: [
                  { department: 'АГД', message: `Импортировано мероприятие: ${String(title).trim()}`, type: 'info' },
                  { department: 'Координация', message: `Импортировано мероприятие: ${String(title).trim()}`, type: 'info' },
                  { department: 'Организация', message: `Импортировано мероприятие: ${String(title).trim()}`, type: 'info' },
                ],
              },
              changeLogs: {
                create: {
                  field: 'status',
                  newValue: status,
                  changedBy: 'Импорт',
                  role: 'system',
                  department: 'system',
                  stage: status,
                  version: 1,
                  comment: 'Импорт из Excel',
                },
              },
            };

            const event = await tx.event.create({
              data: eventData,
              include: { speakers: true, budgetItems: true, tasks: true, assignments: true },
            });

            // Create assignments for "Руководитель (назначен)" — LEAD
            const leadName = String(row['Руководитель (назначен)'] || '').trim();
            if (leadName) {
              const leadUser = await findUserByName(leadName);
              if (leadUser) {
                const zoneMatch = leadName.match(/\(([^)]+)\)/);
                try {
                  await tx.eventAssignment.create({
                    data: {
                      eventId: event.id,
                      userId: leadUser.id,
                      role: 'LEAD',
                      responsibilityZone: zoneMatch ? zoneMatch[1] : 'Руководитель',
                    },
                  });
                  assignmentsCreated++;
                } catch { /* unique constraint */ }
              }
            }

            // Create assignments for "Сопровождение" — SUPPORT
            const supportStr = String(row['Сопровождение'] || '').trim();
            if (supportStr) {
              const supportParts = supportStr.split(';').map((s: string) => s.trim()).filter(Boolean);
              for (const part of supportParts) {
                const supportUser = await findUserByName(part);
                if (supportUser) {
                  const zoneMatch = part.match(/\(([^)]+)\)/);
                  try {
                    await tx.eventAssignment.create({
                      data: {
                        eventId: event.id,
                        userId: supportUser.id,
                        role: 'SUPPORT',
                        responsibilityZone: zoneMatch ? zoneMatch[1] : 'Сопровождение',
                      },
                    });
                    assignmentsCreated++;
                  } catch { /* unique constraint */ }
                }
              }
            }

            results.push({ id: event.id, title: event.title, number: event.number, status: event.status });
          } catch (err: any) {
            errors.push(`Ошибка в строке: ${err.message}`);
          }
        }
      }
    });

    return NextResponse.json({ 
      imported: results.length,
      assignmentsCreated,
      events: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error importing file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
