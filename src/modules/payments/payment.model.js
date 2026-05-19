const mongoose = require('mongoose');
const { PAYMENT_MODES } = require('../../constants/financeEnums');

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    hospitalName: { type: String, required: true, trim: true },

    invoiceNumber: { type: String, trim: true, default: '', index: true },
    paymentDate: { type: Date, required: true, default: () => new Date() },
    amount: { type: Number, required: true, min: 0 },

    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    bankName: { type: String, trim: true, default: '' },
    transactionId: { type: String, trim: true, default: '' },

    paymentTerms: { type: String, trim: true, default: '' },
    remarks: { type: String, trim: true, default: '' },

    // Snapshot of the outstanding row this payment was applied to (if any).
    appliedToOutstandingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outstanding' },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ customerId: 1, paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
