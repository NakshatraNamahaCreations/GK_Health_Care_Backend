const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');

const sparePartSchema = new mongoose.Schema(
  {
    partCode: { type: String, required: true, unique: true, index: true },
    partName: { type: String, required: true, trim: true, index: true },
    compatibleMachine: { type: String, trim: true, default: '', index: true },
    category: { type: String, trim: true, default: '', index: true },
    manufacturer: { type: String, trim: true, default: '' },
    rate: { type: Number, min: 0, default: 0 },
    gstPercentage: { type: Number, min: 0, max: 100, default: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ROLE_STATUS_VALUES,
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

sparePartSchema.index({
  partCode: 'text',
  partName: 'text',
  manufacturer: 'text',
  compatibleMachine: 'text',
});

module.exports = mongoose.model('SparePart', sparePartSchema);
