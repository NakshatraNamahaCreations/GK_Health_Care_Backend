const Counter = require('../modules/counters/counter.model');
const { getCompanyId } = require('../tenant/tenantContext');

// Atomically increments and returns the next sequence for a given key.
// The key is scoped to the active company so each tenant gets its own
// sequence (e.g. every company starts at QTN-00001).
async function nextSeq(key) {
  const cid = getCompanyId();
  const scopedKey = cid ? `${cid.toString()}:${key}` : key;
  const doc = await Counter.findByIdAndUpdate(
    scopedKey,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

// Generates codes like "CUST-00001". `pad` controls the zero-padding width.
async function nextCode(key, prefix, pad = 5) {
  const n = await nextSeq(key);
  return `${prefix}-${String(n).padStart(pad, '0')}`;
}

module.exports = { nextSeq, nextCode };
