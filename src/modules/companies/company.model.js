const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');

// A tenant. Each company owns its own customers, quotations, catalog, etc.
// This is NOT tenant-scoped itself — the super admin manages the set of companies.
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' }, // multi-line
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, default: '' },
    stateName: { type: String, trim: true, default: '' },
    stateCode: { type: String, trim: true, default: '' },
    logoUrl: { type: String, trim: true, default: '' },
    // Bank details — shown on printed quotations/invoices for payment.
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    ifsc: { type: String, trim: true, default: '' },
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

module.exports = mongoose.model('Company', companySchema);
