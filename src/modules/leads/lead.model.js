const mongoose = require('mongoose');
const { LEAD_STATUSES, LEAD_TYPES } = require('../../constants/leadEnums');
const { PHONE_IN, EMAIL } = require('../../constants/regex');

const leadSchema = new mongoose.Schema(
  {
    leadName: { type: String, required: true, trim: true },
    hospitalName: { type: String, trim: true, default: '', index: true },
    contactPersonName: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true, match: [PHONE_IN, 'Invalid phone'] },
    alternatePhone: { type: String, trim: true, match: [PHONE_IN, 'Invalid alternatePhone'] },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL, 'Invalid email'] },

    source: { type: String, trim: true, default: '' }, // Referral, Website, Walk-in, etc.
    leadType: { type: String, enum: LEAD_TYPES, default: 'Warm', index: true },
    leadValue: { type: Number, min: 0, default: 0 },
    requirementType: { type: String, trim: true, default: '' },
    interestedProduct: { type: String, trim: true, default: '' },

    // Lead carries city/state as plain strings (no master link required) per spec.
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },

    followUpDate: { type: Date },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    status: { type: String, enum: LEAD_STATUSES, default: 'New', index: true },
    remarks: { type: String, trim: true, default: '' },

    convertedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    convertedAt: { type: Date },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

leadSchema.index({
  leadName: 'text',
  hospitalName: 'text',
  contactPersonName: 'text',
  phone: 'text',
  email: 'text',
});

const { tenantPlugin } = require('../../tenant/tenantPlugin');
leadSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Lead', leadSchema);
