const Quotation = require('./quotation.model');
const Customer = require('../customers/customer.model');
const Lead = require('../leads/lead.model');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { nextFlatNumber } = require('../../utils/reportNumber');
const { calcQuotation } = require('../../services/quotationCalc');
const orderService = require('../orders/order.service');
const pdfService = require('../../services/pdfService');
const s3 = require('../../services/s3Service');
const {
  QUOTATION_STATUSES,
  QUOTATION_TERMINAL_STATUSES,
} = require('../../constants/quotationEnums');

const { auditLegacy: audit } = require('../../services/auditService');

async function resolveCustomer(customerId) {
  const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!customer) throw ApiError.badRequest('Invalid customerId');
  return customer;
}

async function resolveLead(leadId, customer) {
  if (!leadId) return null;
  const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
  if (!lead) throw ApiError.badRequest('Invalid leadId');
  // Soft sanity check — warn if lead and customer don't agree, but don't block (a lead may not yet be converted).
  if (lead.convertedCustomerId && lead.convertedCustomerId.toString() !== customer._id.toString()) {
    throw ApiError.badRequest('Lead is already converted to a different customer');
  }
  return lead;
}

// PDF helper — same best-effort pattern as report PDFs.
async function generateAndAttachPdf(quotation, customer) {
  if (!s3.isConfigured()) {
    logger.warn(`Quotation PDF skipped — S3 not configured. ${quotation.quotationNumber}`);
    return;
  }
  try {
    const payload = {
      company: {
        name: 'GK Health Care',
        address: 'No 1, Main Road, Bengaluru, Karnataka 560001',
      },
      quotation: quotation.toObject({ virtuals: false }),
      customer: customer.toObject({ virtuals: false }),
      generatedAt: new Date(),
    };
    const buffer = await pdfService.renderToPdf('quotation', payload);
    const out = await s3.putObject({
      buffer,
      mimeType: 'application/pdf',
      moduleKey: 'reports',
      originalName: `${quotation.quotationNumber}.pdf`,
    });
    quotation.pdfUrl = out.fileUrl;
    await quotation.save();
  } catch (err) {
    logger.error(`Quotation PDF failed for ${quotation.quotationNumber}: ${err.message}`);
  }
}

async function createQuotation(payload, actor) {
  const customer = await resolveCustomer(payload.customerId);
  await resolveLead(payload.leadId, customer);

  const calc = calcQuotation({
    items: payload.items,
    freightCharges: payload.freightCharges,
  });

  const quotationNumber = await nextFlatNumber('quotation');

  const quotation = await Quotation.create({
    quotationNumber,
    quotationDate: payload.quotationDate || new Date(),
    customerId: customer._id,
    leadId: payload.leadId,
    hospitalName: customer.hospitalName,
    items: calc.items,
    freightCharges: calc.freightCharges,
    subTotal: calc.subTotal,
    gstTotal: calc.gstTotal,
    grandTotal: calc.grandTotal,
    terms: payload.terms || '',
    status: payload.status || 'Draft',
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  await generateAndAttachPdf(quotation, customer);
  audit('QUOTATION_CREATED', quotation._id, actor._id, null, quotation.toObject());
  return quotation;
}

async function listQuotations(q) {
  const filter = { isDeleted: false };
  if (q.status) filter.status = q.status;
  if (q.customerId) filter.customerId = q.customerId;
  if (q.leadId) filter.leadId = q.leadId;
  if (q.fromDate || q.toDate) {
    filter.quotationDate = {};
    if (q.fromDate) filter.quotationDate.$gte = q.fromDate;
    if (q.toDate) filter.quotationDate.$lte = q.toDate;
  }
  if (q.search) {
    const re = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ quotationNumber: re }, { hospitalName: re }];
  }

  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Quotation.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName phone')
      .populate('leadId', 'leadName status')
      .sort({ quotationDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    Quotation.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 },
  };
}

async function getQuotation(id) {
  const q = await Quotation.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName phone email gstin address pincode')
    .populate('leadId', 'leadName status');
  if (!q) throw ApiError.notFound('Quotation not found');
  return q;
}

async function updateQuotation(id, payload, actor) {
  const q = await Quotation.findOne({ _id: id, isDeleted: false });
  if (!q) throw ApiError.notFound('Quotation not found');
  if (QUOTATION_TERMINAL_STATUSES.includes(q.status)) {
    throw ApiError.badRequest(`Quotation in ${q.status} status cannot be edited`);
  }

  // Recalculate when items or freight change.
  const needsRecalc = payload.items || payload.freightCharges !== undefined;
  if (needsRecalc) {
    const calc = calcQuotation({
      items: payload.items || q.items,
      freightCharges: payload.freightCharges !== undefined ? payload.freightCharges : q.freightCharges,
    });
    q.items = calc.items;
    q.freightCharges = calc.freightCharges;
    q.subTotal = calc.subTotal;
    q.gstTotal = calc.gstTotal;
    q.grandTotal = calc.grandTotal;
  }
  if (payload.quotationDate) q.quotationDate = payload.quotationDate;
  if (typeof payload.terms === 'string') q.terms = payload.terms;
  q.updatedBy = actor._id;

  await q.save();

  // Regenerate PDF whenever anything that appears on it changes.
  const customer = await Customer.findById(q.customerId);
  await generateAndAttachPdf(q, customer);

  audit('QUOTATION_UPDATED', q._id, actor._id, null, q.toObject());
  return q;
}

async function setStatus(id, { status, remarks }, actor) {
  const q = await Quotation.findOne({ _id: id, isDeleted: false });
  if (!q) throw ApiError.notFound('Quotation not found');
  if (!QUOTATION_STATUSES.includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }

  // Convert is reserved for a future explicit flow (e.g. quotation → order).
  // We allow it here but stamp the time; if a stricter rule is needed later, gate this.
  const oldStatus = q.status;
  q.status = status;
  if (typeof remarks === 'string') q.terms = remarks ? `${q.terms || ''}\n${remarks}`.trim() : q.terms;

  const now = new Date();
  if (status === 'Sent' && !q.sentAt) q.sentAt = now;
  if (status === 'Accepted') q.acceptedAt = now;
  if (status === 'Rejected') q.rejectedAt = now;
  if (status === 'Converted') q.convertedAt = now;

  q.updatedBy = actor._id;
  await q.save();

  // Accepting a quotation creates an order (idempotent — one order per quotation).
  if (status === 'Accepted' && oldStatus !== 'Accepted') {
    try {
      await orderService.createFromQuotation(q, actor._id);
    } catch (err) {
      logger.error(`Order auto-create failed for ${q.quotationNumber}: ${err.message}`);
    }
  }

  audit('QUOTATION_STATUS_CHANGED', q._id, actor._id, { status: oldStatus }, { status });
  return q;
}

async function softDeleteQuotation(id, actor) {
  const q = await Quotation.findOne({ _id: id, isDeleted: false });
  if (!q) throw ApiError.notFound('Quotation not found');
  q.isDeleted = true;
  q.deletedAt = new Date();
  q.deletedBy = actor._id;
  q.updatedBy = actor._id;
  await q.save();
  audit('QUOTATION_DELETED', q._id, actor._id, null, null);
  return { deleted: true };
}

module.exports = {
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotation,
  setStatus,
  softDeleteQuotation,
};
