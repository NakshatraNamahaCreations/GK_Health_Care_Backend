const mongoose = require('mongoose');
const { EXPENSE_STATUSES } = require('../../constants/financeEnums');

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true, index: true },
    categoryName: { type: String, required: true, trim: true },

    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true, default: () => new Date() },
    description: { type: String, trim: true, default: '' },
    attachmentUrl: { type: String, default: '' },

    status: { type: String, enum: EXPENSE_STATUSES, default: 'Pending', index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalRemarks: { type: String, trim: true, default: '' },
    approvedAt: { type: Date },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, expenseDate: -1 });
expenseSchema.index({ status: 1, expenseDate: -1 });

const { tenantPlugin } = require('../../tenant/tenantPlugin');
expenseSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Expense', expenseSchema);
