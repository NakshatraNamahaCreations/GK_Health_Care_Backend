const mongoose = require('mongoose');

// Singleton document — one row holds the seller/company details shown on
// printed quotations (and any future documents like invoices/POs).
const companySettingsSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    tagline: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' }, // multi-line
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, default: '' },
    stateName: { type: String, trim: true, default: '' },
    stateCode: { type: String, trim: true, default: '' },
    logoUrl: { type: String, trim: true, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
