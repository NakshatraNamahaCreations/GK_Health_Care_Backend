// Shared building blocks for the three report collections (installation, service, PM).
// Each report model spreads these in so the schema shape stays consistent without
// pushing everything into a single collection or refPath.

const mongoose = require('mongoose');
const { REPORT_STATUSES } = require('../../../constants/reportEnums');

// Common audit + denormalized header fields every report carries.
const commonReportFields = {
  // Unique per company — the compound index is added on each report schema.
  reportNumber: { type: String, required: true, index: true },
  reportDate: { type: Date, required: true, default: () => new Date() },

  // Optional link to the order this report was created from.
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  hospitalName: { type: String, required: true, trim: true },

  customerMachineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerMachine',
    required: true,
    index: true,
  },
  machineName: { type: String, required: true, trim: true },
  serialNumber: { type: String, trim: true, default: '' },

  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  technicianName: { type: String, required: true, trim: true },

  customerSignatureUrl: { type: String, default: '' },
  technicianSignatureUrl: { type: String, default: '' },

  pdfUrl: { type: String, default: '' },

  status: {
    type: String,
    enum: REPORT_STATUSES,
    default: 'Draft',
    index: true,
  },

  // Soft delete + audit
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
};

// Embedded spare-part-used line (used in service & PM reports).
const sparePartUsedSchema = new mongoose.Schema(
  {
    sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart' },
    partCode: { type: String, trim: true, default: '' },
    partName: { type: String, trim: true, default: '' },
    quantity: { type: Number, min: 0, required: true },
    rate: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

module.exports = { commonReportFields, sparePartUsedSchema };
