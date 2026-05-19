const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');

const expenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ROLE_STATUS_VALUES,
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
