const Counter = require('../modules/counters/counter.model');

// Atomically increments and returns the next sequence for a given key.
async function nextSeq(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
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
