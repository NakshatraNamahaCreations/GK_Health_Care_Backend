// Generic Excel parsing helper built on ExcelJS.
// Reads the first worksheet and maps each data row into an object keyed by the header row.
const ExcelJS = require('exceljs');
const ApiError = require('../utils/ApiError');

async function parseFirstSheet(buffer) {
  if (!buffer || !buffer.length) throw ApiError.badRequest('Empty file');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) throw ApiError.badRequest('Workbook has no worksheets');

  // Row 1 is the header.
  const headerRow = ws.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });
  if (!headers.length) throw ApiError.badRequest('Header row is empty');

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const obj = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const cell = row.getCell(idx + 1);
      const v = cell.value;
      // Normalize ExcelJS richtext / formula objects into a plain string/number.
      if (v && typeof v === 'object') {
        if ('text' in v) obj[h] = String(v.text).trim();
        else if ('result' in v) obj[h] = v.result;
        else if (v instanceof Date) obj[h] = v;
        else obj[h] = v;
      } else {
        obj[h] = typeof v === 'string' ? v.trim() : v;
      }
    });
    rows.push({ rowNumber, data: obj });
  });

  return { headers, rows };
}

module.exports = { parseFirstSheet };
