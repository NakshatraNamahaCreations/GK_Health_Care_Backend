// Centralized report-number generator. Wraps the shared atomic counter so each
// report type gets its own monotonic sequence, but all of them share the same
// generation pattern.
//
// Format: <PREFIX>-<YY><MM>-<NNNNN>
//   e.g.  INST-2605-00001   (May 2026, sequence #1)
//         SVC-2605-00001
//
// The sequence resets monthly per-prefix because the counter key includes year+month.
//
// To skip the year-month roll-over and use a flat sequence (like quotations want
// in some businesses), call nextCode(key, prefix, pad) directly from codeGenerator.

const { nextSeq, nextCode } = require('./codeGenerator');

// Map report kind → prefix.
const REPORT_PREFIXES = Object.freeze({
  installation: 'INST',
  service: 'SVC',
  preventiveMaintenance: 'PM',
  inspection: 'INSP',
  incident: 'INC',
  quotation: 'QTN',
});

function ym(date = new Date()) {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

// Monthly-resetting per-kind sequence.
async function nextReportNumber(kind, date = new Date()) {
  const prefix = REPORT_PREFIXES[kind];
  if (!prefix) throw new Error(`Unknown report kind: ${kind}`);
  const yymm = ym(date);
  const counterKey = `report:${kind}:${yymm}`;
  const seq = await nextSeq(counterKey);
  return `${prefix}-${yymm}-${String(seq).padStart(5, '0')}`;
}

// Flat (non-resetting) sequence — useful for quotations / invoices where the
// sequence shouldn't roll over each month.
async function nextFlatNumber(kind, padding = 5) {
  const prefix = REPORT_PREFIXES[kind];
  if (!prefix) throw new Error(`Unknown report kind: ${kind}`);
  return nextCode(`report:${kind}`, prefix, padding);
}

module.exports = { nextReportNumber, nextFlatNumber, REPORT_PREFIXES };
