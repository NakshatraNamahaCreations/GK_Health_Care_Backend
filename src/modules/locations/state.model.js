const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');

const stateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, uppercase: true, default: '' }, // e.g. "KA"
    country: { type: String, trim: true, default: 'India' },
    status: {
      type: String,
      enum: ROLE_STATUS_VALUES, // Active / Inactive (same shape)
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// `name` is unique → automatic index; no separate stateSchema.index({name:1}) needed.

module.exports = mongoose.model('State', stateSchema);
