const Outstanding = require('./outstanding.model');
const Customer = require('../customers/customer.model');
const ApiError = require('../../utils/ApiError');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Recomputes Outstanding.status from its current numbers + dueDate.
function deriveStatus(doc, asOf = new Date()) {
  if (doc.balanceAmount <= 0) return 'Paid';
  if (doc.paidAmount > 0) return doc.dueDate && asOf > doc.dueDate ? 'Overdue' : 'Partially Paid';
  return doc.dueDate && asOf > doc.dueDate ? 'Overdue' : 'Open';
}

// Sums balanceAmount across all non-paid outstandings for a customer and
// writes it onto customer.totalOutstanding.
async function recomputeCustomerTotalOutstanding(customerId, actorId, session) {
  const match = { customerId, isDeleted: false, status: { $ne: 'Paid' } };
  const result = await Outstanding.aggregate([
    { $match: match },
    { $group: { _id: '$customerId', total: { $sum: '$balanceAmount' } } },
  ]).option(session ? { session } : {});
  const total = round2(result[0]?.total || 0);
  await Customer.findByIdAndUpdate(
    customerId,
    { totalOutstanding: total, updatedBy: actorId },
    session ? { session } : undefined
  );
  return total;
}

async function assertCustomer(customerId) {
  const c = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!c) throw ApiError.badRequest('Invalid customerId');
  return c;
}

async function createOutstanding(payload, actorId) {
  const customer = await assertCustomer(payload.customerId);

  const dupe = await Outstanding.findOne({
    customerId: customer._id,
    invoiceNumber: payload.invoiceNumber,
    isDeleted: false,
  });
  if (dupe) throw ApiError.conflict('Outstanding already exists for this invoice');

  const invoiceAmount = round2(payload.invoiceAmount);
  const draft = {
    customerId: customer._id,
    hospitalName: customer.hospitalName,
    invoiceNumber: payload.invoiceNumber,
    invoiceDate: payload.invoiceDate,
    invoiceAmount,
    paidAmount: 0,
    balanceAmount: invoiceAmount,
    dueDate: payload.dueDate,
    status: 'Open', // overwritten by deriveStatus below
    createdBy: actorId,
    updatedBy: actorId,
  };
  draft.status = deriveStatus(draft);

  const doc = await Outstanding.create(draft);
  await recomputeCustomerTotalOutstanding(customer._id, actorId);
  return doc;
}

// Called from the payment service. Applies an amount to the matching invoice,
// updates paidAmount/balanceAmount/status, and recomputes customer.totalOutstanding.
// Silently no-op if no matching outstanding exists — payments can be standalone
// (e.g. an advance) so this isn't an error case.
async function applyPaymentToOutstanding({ customerId, invoiceNumber, amount }, actorId, session) {
  if (!invoiceNumber || !amount) return null;

  const opts = session ? { session } : undefined;

  const out = await Outstanding.findOne({
    customerId,
    invoiceNumber,
    isDeleted: false,
  }, null, opts);
  if (!out) return null;

  const newPaid = round2(out.paidAmount + Number(amount));
  out.paidAmount = newPaid;
  out.balanceAmount = round2(Math.max(0, out.invoiceAmount - newPaid));
  out.status = deriveStatus(out);
  out.updatedBy = actorId;
  await out.save(opts);

  await recomputeCustomerTotalOutstanding(customerId, actorId, session);
  return out;
}

async function listOutstandings(q) {
  const filter = { isDeleted: false };
  if (q.status) filter.status = q.status;
  if (q.customerId) filter.customerId = q.customerId;
  if (q.overdueOnly) {
    filter.status = { $ne: 'Paid' };
    filter.dueDate = { $lt: new Date() };
    filter.balanceAmount = { $gt: 0 };
  }
  if (q.search) {
    const re = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ invoiceNumber: re }, { hospitalName: re }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Outstanding.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName phone')
      .sort({ dueDate: 1, invoiceDate: -1 })
      .skip(skip)
      .limit(q.limit),
    Outstanding.countDocuments(filter),
  ]);
  return { items, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 } };
}

async function listByCustomer(customerId) {
  await assertCustomer(customerId);
  return Outstanding.find({ customerId, isDeleted: false }).sort({ invoiceDate: -1 });
}

module.exports = {
  createOutstanding,
  applyPaymentToOutstanding,
  recomputeCustomerTotalOutstanding,
  listOutstandings,
  listByCustomer,
  deriveStatus,
};
