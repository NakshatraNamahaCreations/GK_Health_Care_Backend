const Order = require('./order.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');

// Create an order from an accepted quotation. Idempotent — if an order already
// exists for the quotation, it is returned unchanged.
async function createFromQuotation(quotation, actorId) {
  const existing = await Order.findOne({
    quotationId: quotation._id,
    isDeleted: false,
  });
  if (existing) return existing;

  const orderNumber = await nextCode('order', 'ORD', 5);

  const items = (quotation.items || []).map((it) => ({
    itemType: it.itemType,
    itemId: it.itemId,
    name: it.name,
    hsnCode: it.hsnCode || '',
    parts: (it.parts || []).map((p) => ({ name: p.name, quantity: p.quantity })),
    quantity: it.quantity,
    rate: it.rate,
    discount: it.discount || 0,
    gstPercentage: it.gstPercentage || 0,
    gstAmount: it.gstAmount || 0,
    total: it.total || 0,
  }));

  return Order.create({
    orderNumber,
    orderDate: new Date(),
    quotationId: quotation._id,
    quotationNumber: quotation.quotationNumber,
    customerId: quotation.customerId,
    hospitalName: quotation.hospitalName,
    items,
    freightCharges: quotation.freightCharges,
    subTotal: quotation.subTotal,
    gstTotal: quotation.gstTotal,
    grandTotal: quotation.grandTotal,
    terms: quotation.terms,
    createdBy: actorId,
    updatedBy: actorId,
  });
}

async function listOrders({ page, limit, search, status, customerId }) {
  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderNumber: re }, { quotationNumber: re }, { hospitalName: re }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName phone')
      .sort({ orderDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

async function getOrder(id) {
  const order = await Order.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName phone email gstin address')
    .populate('quotationId', 'quotationNumber status');
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

async function updateStatus(id, status, actorId) {
  const order = await Order.findOne({ _id: id, isDeleted: false });
  if (!order) throw ApiError.notFound('Order not found');
  order.status = status;
  order.updatedBy = actorId;
  await order.save();
  return order;
}

module.exports = { createFromQuotation, listOrders, getOrder, updateStatus };
