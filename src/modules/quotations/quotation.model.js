const mongoose = require('mongoose');
const {
  QUOTATION_STATUSES,
  QUOTATION_ITEM_TYPES,
} = require('../../constants/quotationEnums');

const quotationItemPartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 1 },
  },
  { _id: false }
);

const quotationItemSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: QUOTATION_ITEM_TYPES, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId }, // loose ref — could be Product or SparePart
    name: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true, default: '' },
    // Snapshot of the product's parts (BOM) at the time of quoting.
    parts: { type: [quotationItemPartSchema], default: [] },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gstPercentage: { type: Number, default: 0, min: 0, max: 100 },
    gstAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, required: true, index: true },
    quotationDate: { type: Date, required: true, default: () => new Date() },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    hospitalName: { type: String, required: true, trim: true },

    items: { type: [quotationItemSchema], default: [] },

    freightCharges: { type: Number, default: 0, min: 0 },
    subTotal: { type: Number, default: 0, min: 0 },
    gstTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },

    terms: { type: String, trim: true, default: '' },
    status: { type: String, enum: QUOTATION_STATUSES, default: 'Draft', index: true },

    sentAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    convertedAt: { type: Date },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

quotationSchema.index({ customerId: 1, quotationDate: -1 });
quotationSchema.index({ quotationNumber: 'text', hospitalName: 'text' });

quotationSchema.index({ companyId: 1, quotationNumber: 1 }, { unique: true });

const { tenantPlugin } = require('../../tenant/tenantPlugin');
quotationSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Quotation', quotationSchema);
