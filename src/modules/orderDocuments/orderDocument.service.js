const OrderDocument = require('./orderDocument.model');
const Order = require('../orders/order.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');

const { DOC_PREFIX } = OrderDocument;

// Field on the order that points back to each document type.
const ORDER_REF_FIELD = Object.freeze({
  PurchaseOrder: 'purchaseOrderId',
  DeliveryNote: 'deliveryNoteId',
});

function normalizeItems(items) {
  return (items || []).map((it) => {
    const quantity = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    return {
      name: (it.name || '').trim(),
      hsnCode: (it.hsnCode || '').trim(),
      quantity,
      rate,
      gstPercentage: Number(it.gstPercentage || 0),
      amount: it.amount !== undefined ? Number(it.amount) : quantity * rate,
    };
  });
}

async function createDocument(payload, actorId) {
  const order = await Order.findOne({ _id: payload.orderId, isDeleted: false });
  if (!order) throw ApiError.badRequest('Invalid orderId');

  const prefix = DOC_PREFIX[payload.docType];
  const docNumber = await nextCode(`order-doc:${payload.docType}`, prefix, 5);

  const doc = await OrderDocument.create({
    docType: payload.docType,
    docNumber,
    docDate: payload.docDate || new Date(),
    orderId: order._id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    hospitalName: order.hospitalName,
    vendorName: payload.vendorName || '',
    expectedDeliveryDate: payload.expectedDeliveryDate,
    dispatchedThrough: payload.dispatchedThrough || '',
    docketNumber: payload.docketNumber || '',
    destination: payload.destination || '',
    vehicleNumber: payload.vehicleNumber || '',
    receivedBy: payload.receivedBy || '',
    sentBy: payload.sentBy || '',
    approvedBy: payload.approvedBy || '',
    packedBy: payload.packedBy || '',
    items: normalizeItems(payload.items),
    notes: payload.notes || '',
    status: payload.status || 'Draft',
    createdBy: actorId,
    updatedBy: actorId,
  });

  // Link the order back to this document.
  const refField = ORDER_REF_FIELD[payload.docType];
  if (refField) {
    order[refField] = doc._id;
    order.updatedBy = actorId;
    await order.save();
  }

  return doc;
}

async function listDocuments({ orderId, docType }) {
  const filter = { isDeleted: false };
  if (orderId) filter.orderId = orderId;
  if (docType) filter.docType = docType;
  return OrderDocument.find(filter).sort({ createdAt: -1 });
}

async function getDocument(id) {
  const doc = await OrderDocument.findOne({ _id: id, isDeleted: false })
    .populate('orderId', 'orderNumber status')
    .populate(
      'customerId',
      'customerCode customerName hospitalName phone email gstin address stateName cityName pincode'
    );
  if (!doc) throw ApiError.notFound('Document not found');
  return doc;
}

async function updateDocument(id, payload, actorId) {
  const doc = await OrderDocument.findOne({ _id: id, isDeleted: false });
  if (!doc) throw ApiError.notFound('Document not found');

  const editable = [
    'docDate',
    'vendorName',
    'expectedDeliveryDate',
    'dispatchedThrough',
    'docketNumber',
    'destination',
    'vehicleNumber',
    'receivedBy',
    'sentBy',
    'approvedBy',
    'packedBy',
    'notes',
    'status',
  ];
  for (const key of editable) {
    if (payload[key] !== undefined) doc[key] = payload[key];
  }
  if (payload.items !== undefined) doc.items = normalizeItems(payload.items);
  doc.updatedBy = actorId;
  await doc.save();
  return doc;
}

module.exports = { createDocument, listDocuments, getDocument, updateDocument };
