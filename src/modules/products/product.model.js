const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');
const { PRODUCT_TYPES } = require('../../constants/productTypes');

const productSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, unique: true, index: true },
    productName: { type: String, required: true, trim: true, index: true },
    productType: { type: String, enum: PRODUCT_TYPES, required: true, index: true },
    category: { type: String, trim: true, default: '', index: true },
    manufacturer: { type: String, trim: true, default: '' },
    modelNumber: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, min: 0, default: 0 },
    gstPercentage: { type: Number, min: 0, max: 100, default: 0 },
    hsnCode: { type: String, trim: true, default: '' },
    warrantyMonths: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ROLE_STATUS_VALUES, // Active / Inactive
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

productSchema.index({
  productCode: 'text',
  productName: 'text',
  manufacturer: 'text',
  modelNumber: 'text',
});

module.exports = mongoose.model('Product', productSchema);
