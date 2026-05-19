const mongoose = require('mongoose');

// Atomic sequence counter shared across modules.
// One document per sequence key (e.g. "customer", "quotation", "task").
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // sequence key
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Counter', counterSchema);
