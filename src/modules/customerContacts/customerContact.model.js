const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');
const { PHONE_IN, EMAIL } = require('../../constants/regex');

const customerContactSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, match: [PHONE_IN, 'Invalid phone'] },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL, 'Invalid email'] },
    position: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    remarks: { type: String, trim: true, default: '' },
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

module.exports = mongoose.model('CustomerContact', customerContactSchema);
