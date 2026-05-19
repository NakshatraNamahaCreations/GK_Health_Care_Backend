const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    stateName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ROLE_STATUS_VALUES,
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One city name per state.
citySchema.index({ stateId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('City', citySchema);
