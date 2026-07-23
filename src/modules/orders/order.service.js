const Order = require('./order.model');
const CustomerMachine = require('../customerMachines/customerMachine.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');

// Each Product line on the order is a machine the customer now owns, so we
// register it under the customer straight away (serial number filled in later
// at installation). Best-effort: a failure here must never block the order.
async function registerMachinesFromOrder(order, actorId) {
  try {
    const productItems = (order.items || []).filter(
      (it) => String(it.itemType || '').toLowerCase() === 'product'
    );
    for (const it of productItems) {
      const units = Math.max(1, Number(it.quantity) || 1);
      const isRent = String(it.saleType || '').toLowerCase() === 'rent';
      for (let i = 0; i < units; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await CustomerMachine.create({
          customerId: order.customerId,
          productId: it.itemId || undefined,
          orderId: order._id,
          machineName: it.name,
          soldDate: order.orderDate,
          machineStatus: 'Installed',
          // Rented machines are tagged with the Rental service type.
          serviceType: isRent ? 'Rental' : undefined,
          remarks:
            `Auto-registered from order ${order.orderNumber}` +
            (isRent && it.rentMonths ? ` — Rental, ${it.rentMonths} months` : isRent ? ' — Rental' : ''),
          createdBy: actorId,
          updatedBy: actorId,
        });
      }
    }
  } catch (err) {
    // Log and move on — the order is already created and must stand.
    // eslint-disable-next-line no-console
    console.error('registerMachinesFromOrder failed:', err.message);
  }
}

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
    saleType: it.saleType || 'Sale',
    rentMonths: it.rentMonths,
    rate: it.rate,
    discount: it.discount || 0,
    gstPercentage: it.gstPercentage || 0,
    gstAmount: it.gstAmount || 0,
    total: it.total || 0,
  }));

  const order = await Order.create({
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

  // Register the ordered machines under the customer (idempotent by virtue of
  // order creation itself being idempotent — this runs only on first create).
  await registerMachinesFromOrder(order, actorId);

  return order;
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
    .populate(
      'customerId',
      'customerCode customerName hospitalName phone email gstin address stateName cityName pincode'
    )
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
