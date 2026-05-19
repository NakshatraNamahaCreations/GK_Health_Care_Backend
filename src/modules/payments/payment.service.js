const mongoose = require('mongoose');
const Payment = require('./payment.model');
const Customer = require('../customers/customer.model');
const outstandingService = require('../outstandings/outstanding.service');
const ApiError = require('../../utils/ApiError');

const { auditLegacy: audit } = require('../../services/auditService');

async function assertCustomer(customerId) {
  const c = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!c) throw ApiError.badRequest('Invalid customerId');
  return c;
}

async function createPayment(payload, actor) {
  const customer = await assertCustomer(payload.customerId);

  const session = await mongoose.startSession().catch(() => null);
  let payment;
  try {
    if (session) session.startTransaction();
    const opts = session ? { session } : undefined;

    [payment] = await Payment.create(
      [
        {
          customerId: customer._id,
          hospitalName: customer.hospitalName,
          invoiceNumber: payload.invoiceNumber || '',
          paymentDate: payload.paymentDate || new Date(),
          amount: payload.amount,
          paymentMode: payload.paymentMode,
          bankName: payload.bankName,
          transactionId: payload.transactionId,
          paymentTerms: payload.paymentTerms,
          remarks: payload.remarks,
          createdBy: actor._id,
          updatedBy: actor._id,
        },
      ],
      opts
    );

    // If an invoice was referenced, push the amount into the matching outstanding.
    // Returns the updated outstanding doc, or null if none was found (standalone payment).
    const out = await outstandingService.applyPaymentToOutstanding(
      {
        customerId: customer._id,
        invoiceNumber: payload.invoiceNumber,
        amount: payload.amount,
      },
      actor._id,
      session
    );
    if (out) {
      payment.appliedToOutstandingId = out._id;
      await payment.save(opts);
    } else {
      // Even without a matching invoice we want customer.totalOutstanding to stay current —
      // recompute it (idempotent; cheap aggregation).
      await outstandingService.recomputeCustomerTotalOutstanding(customer._id, actor._id, session);
    }

    if (session) await session.commitTransaction();
  } catch (err) {
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }

  audit('PAYMENT_ADDED', payment._id, actor._id, null, payment.toObject());
  return payment;
}

async function listPayments(q) {
  const filter = { isDeleted: false };
  if (q.paymentMode) filter.paymentMode = q.paymentMode;
  if (q.customerId) filter.customerId = q.customerId;
  if (q.fromDate || q.toDate) {
    filter.paymentDate = {};
    if (q.fromDate) filter.paymentDate.$gte = q.fromDate;
    if (q.toDate) filter.paymentDate.$lte = q.toDate;
  }
  if (q.search) {
    const re = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ invoiceNumber: re }, { hospitalName: re }, { transactionId: re }];
  }
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    Payment.countDocuments(filter),
  ]);
  return { items, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 } };
}

async function listByCustomer(customerId) {
  await assertCustomer(customerId);
  return Payment.find({ customerId, isDeleted: false }).sort({ paymentDate: -1 });
}

module.exports = { createPayment, listPayments, listByCustomer };
