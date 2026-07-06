const mongoose = require('mongoose');
const { tenantPlugin } = require('../../tenant/tenantPlugin');

const ORDER_STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled'];

// Line item snapshotted from the accepted quotation.
const orderItemSchema = new mongoose.Schema(
  {
    itemType: { type: String },
    itemId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, trim: true },
    hsnCode: { type: String, trim: true, default: '' },
    parts: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, trim: true },
            quantity: { type: Number, min: 0, default: 1 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    quantity: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, index: true },
    orderDate: { type: Date, default: () => new Date() },

    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', index: true },
    quotationNumber: { type: String, trim: true, default: '' },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    hospitalName: { type: String, trim: true, default: '' },

    items: { type: [orderItemSchema], default: [] },
    freightCharges: { type: Number, default: 0 },
    subTotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    status: { type: String, enum: ORDER_STATUSES, default: 'Open', index: true },

    // References to the documents generated from this order (Phase 2).
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    deliveryNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryNote' },
    installationReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstallationReport' },
    serviceReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceReport' },

    terms: { type: String, trim: true, default: '' },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Order numbers are unique per company.
orderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
orderSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
