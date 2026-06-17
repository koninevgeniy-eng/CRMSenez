type ExcelCell = string | number | boolean | Date | null | undefined;

interface ExcelSheetData {
  name: string;
  rows: ExcelCell[][];
  columnWidths?: number[];
}

export async function exportWorkbook(filename: string, sheets: ExcelSheetData[]) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CRM Сенеж';
  workbook.created = new Date();

  for (const sheetData of sheets) {
    const sheet = workbook.addWorksheet(sheetData.name);
    if (sheetData.columnWidths) {
      sheet.columns = sheetData.columnWidths.map(width => ({ width }));
    }
    sheet.addRows(sheetData.rows.map(row => row.map(value => value ?? '')));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
