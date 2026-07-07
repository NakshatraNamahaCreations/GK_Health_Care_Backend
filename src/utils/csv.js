// Minimal, dependency-free CSV helpers (RFC-4180-ish).
// Handles quoted fields containing commas, quotes ("" escaping) and newlines.
const ApiError = require('./ApiError');

// Parse raw CSV text into an array of string-arrays (one per record).
function parseCsv(text) {
  if (typeof text !== 'string') text = String(text || '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignore; \n handles the line break
    } else if (ch === '\n') {
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else {
      field += ch;
    }
  }
  // Flush trailing field/record (file not ending in newline).
  if (field !== '' || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
}

// Parse CSV text into { headers, rows } — the same shape excelService returns,
// so import services can treat CSV and XLSX identically.
function rowsFromCsv(text) {
  const records = parseCsv(text).filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!records.length) throw ApiError.badRequest('CSV file is empty');

  const headers = records[0].map((h) => String(h).trim());
  const rows = [];
  for (let r = 1; r < records.length; r += 1) {
    const rec = records[r];
    const data = {};
    headers.forEach((h, idx) => {
      if (h) data[h] = String(rec[idx] ?? '').trim();
    });
    rows.push({ rowNumber: r + 1, data });
  }
  return { headers, rows };
}

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Serialize a header array + array-of-rows into a CSV string (CRLF line ends).
function toCsv(headers, records) {
  const lines = [headers.map(csvCell).join(',')];
  for (const rec of records) lines.push(rec.map(csvCell).join(','));
  return lines.join('\r\n');
}

module.exports = { parseCsv, rowsFromCsv, toCsv };
