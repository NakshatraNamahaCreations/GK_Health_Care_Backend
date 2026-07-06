const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');
const { CUSTOMER_TYPES } = require('../../constants/customerTypes');
const { PHONE_IN, PINCODE_IN, EMAIL, GSTIN } = require('../../constants/regex');

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, match: [PHONE_IN, 'Invalid phone'] },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL, 'Invalid email'] },
    hospitalName: { type: String, required: true, trim: true, index: true },
    gstin: { type: String, trim: true, uppercase: true, match: [GSTIN, 'Invalid GSTIN'] },
    address: { type: String, trim: true, default: '' },

    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
    stateName: { type: String, trim: true, default: '' },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    cityName: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, match: [PINCODE_IN, 'Invalid pincode'] },

    customerType: { type: String, enum: CUSTOMER_TYPES, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    totalOutstanding: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ROLE_STATUS_VALUES, // Active / Inactive
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Search helpers — text index covers list-search across the most common fields.
customerSchema.index({
  customerName: 'text',
  hospitalName: 'text',
  phone: 'text',
  email: 'text',
  customerCode: 'text',
});

customerSchema.index({ companyId: 1, customerCode: 1 }, { unique: true });

const { tenantPlugin } = require('../../tenant/tenantPlugin');
customerSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Customer', customerSchema);
