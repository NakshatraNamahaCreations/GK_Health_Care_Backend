const mongoose = require('mongoose');
const { OUTSTANDING_STATUSES } = require('../../constants/financeEnums');

const outstandingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    hospitalName: { type: String, required: true, trim: true },

    invoiceNumber: { type: String, required: true, trim: true, index: true },
    invoiceDate: { type: Date, required: true },

    invoiceAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },

    dueDate: { type: Date },

    status: { type: String, enum: OUTSTANDING_STATUSES, default: 'Open', index: true },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One outstanding row per (customer, invoice).
outstandingSchema.index({ companyId: 1, customerId: 1, invoiceNumber: 1 }, { unique: true });
outstandingSchema.index({ dueDate: 1, status: 1 });

const { tenantPlugin } = require('../../tenant/tenantPlugin');
outstandingSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Outstanding', outstandingSchema);
