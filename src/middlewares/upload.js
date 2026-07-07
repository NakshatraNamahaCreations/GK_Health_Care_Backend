// Reusable multer factories. Files are kept in memory so the controller can
// hand the buffer to S3 (or the Excel parser) without touching disk.
const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Size limits per kind.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5 MB
const MAX_PDF_BYTES = 15 * 1024 * 1024;    // 15 MB
const MAX_EXCEL_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_ANY_BYTES = 25 * 1024 * 1024;    // hard ceiling for the generic uploader

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const PDF_MIMES = ['application/pdf'];
const EXCEL_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',
  'application/octet-stream', // some browsers send this for .xlsx
];
const CSV_MIMES = [
  'text/csv',
  'application/csv',
  'text/plain', // some browsers send this for .csv
];

// Module → allowed mimes for the generic /uploads/single endpoint.
const UPLOAD_MODULE_MIMES = Object.freeze({
  signatures: IMAGE_MIMES,
  photos: IMAGE_MIMES,
  profiles: IMAGE_MIMES,
  bills: [...IMAGE_MIMES, ...PDF_MIMES],
  reports: PDF_MIMES,
  imports: EXCEL_MIMES,
  products: IMAGE_MIMES,
});

const memoryStorage = multer.memoryStorage();

function fileFilterByMime(allowed) {
  return (req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
  };
}

// Excel-only uploader (used by /products/import-excel and /spare-parts/import-excel).
const excelUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_EXCEL_BYTES },
  fileFilter: fileFilterByMime(EXCEL_MIMES),
});

// Spreadsheet uploader for data imports — accepts CSV and Excel. Used by
// /customers/import (and any future name-based import endpoint).
const spreadsheetUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_EXCEL_BYTES },
  fileFilter: fileFilterByMime([...CSV_MIMES, ...EXCEL_MIMES]),
});

// Generic uploader for /uploads/single. Accepts the union of allowed mimes; the
// controller validates that the chosen `module` permits that specific mime.
const genericUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_ANY_BYTES },
  fileFilter: fileFilterByMime([...IMAGE_MIMES, ...PDF_MIMES, ...EXCEL_MIMES]),
});

// Helper for controllers — enforces per-module mime + size after the upload lands in memory.
function assertAllowedForModule(file, moduleKey) {
  const allowed = UPLOAD_MODULE_MIMES[moduleKey];
  if (!allowed) throw ApiError.badRequest(`Unknown upload module: ${moduleKey}`);
  if (!allowed.includes(file.mimetype)) {
    throw ApiError.badRequest(
      `Module "${moduleKey}" only accepts: ${allowed.join(', ')} (got ${file.mimetype})`
    );
  }

  const isImage = IMAGE_MIMES.includes(file.mimetype);
  const isPdf = PDF_MIMES.includes(file.mimetype);
  const isExcel = EXCEL_MIMES.includes(file.mimetype);
  const cap = isImage ? MAX_IMAGE_BYTES : isPdf ? MAX_PDF_BYTES : isExcel ? MAX_EXCEL_BYTES : MAX_ANY_BYTES;
  if (file.size > cap) {
    throw ApiError.badRequest(`File too large for ${moduleKey} (max ${cap} bytes)`);
  }
}

module.exports = {
  excelUpload,
  spreadsheetUpload,
  genericUpload,
  assertAllowedForModule,
  UPLOAD_MODULE_MIMES,
};
