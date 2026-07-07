const mongoose = require('mongoose');
const { tenantPlugin } = require('../../tenant/tenantPlugin');

const ORDER_DOC_TYPES = ['PurchaseOrder', 'DeliveryNote'];
const ORDER_DOC_STATUSES = ['Draft', 'Issued', 'Completed', 'Cancelled'];

// Number prefix per document type.
const DOC_PREFIX = Object.freeze({ PurchaseOrder: 'PO', DeliveryNote: 'DN' });

const docItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    hsnCode: { type: String, trim: true, default: '' },
    quantity: { type: Number, min: 0, default: 1 },
    rate: { type: Number, min: 0, default: 0 },
    gstPercentage: { type: Number, min: 0, max: 100, default: 0 },
    amount: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

// One collection holds both Purchase Orders and Delivery Notes; `docType`
// distinguishes them. Fields not relevant to a type are simply left empty.
const orderDocumentSchema = new mongoose.Schema(
  {
    docType: { type: String, enum: ORDER_DOC_TYPES, required: true, index: true },
    docNumber: { type: String, required: true, index: true },
    docDate: { type: Date, default: () => new Date() },

    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, trim: true, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    hospitalName: { type: String, trim: true, default: '' },

    // Purchase Order specific
    vendorName: { type: String, trim: true, default: '' },
    expectedDeliveryDate: { type: Date },

    // Delivery Note specific — shown on the printout
    dispatchedThrough: { type: String, trim: true, default: '' },
    docketNumber: { type: String, trim: true, default: '' },
    destination: { type: String, trim: true, default: '' },
    vehicleNumber: { type: String, trim: true, default: '' }, // motor vehicle number
    receivedBy: { type: String, trim: true, default: '' },
    // Internal reference — NOT printed
    sentBy: { type: String, trim: true, default: '' },
    approvedBy: { type: String, trim: true, default: '' },
    packedBy: { type: String, trim: true, default: '' },

    items: { type: [docItemSchema], default: [] },
    notes: { type: String, trim: true, default: '' },

    status: { type: String, enum: ORDER_DOC_STATUSES, default: 'Draft', index: true },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

orderDocumentSchema.index({ companyId: 1, docNumber: 1 }, { unique: true });
orderDocumentSchema.plugin(tenantPlugin);

const OrderDocument = mongoose.model('OrderDocument', orderDocumentSchema);
OrderDocument.ORDER_DOC_TYPES = ORDER_DOC_TYPES;
OrderDocument.ORDER_DOC_STATUSES = ORDER_DOC_STATUSES;
OrderDocument.DOC_PREFIX = DOC_PREFIX;

module.exports = OrderDocument;
