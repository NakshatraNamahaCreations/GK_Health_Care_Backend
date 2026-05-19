const mongoose = require('mongoose');
const Lead = require('./lead.model');
const LeadFollowUp = require('./leadFollowUp.model');
const Customer = require('../customers/customer.model');
const State = require('../locations/state.model');
const City = require('../locations/city.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { LEAD_TERMINAL_STATUSES } = require('../../constants/leadEnums');
const { ROLE_STATUS } = require('../../constants/status');

const { auditLegacy: audit } = require('../../services/auditService');
const notificationService = require('../../services/notificationService');

// Lightweight cached lookup of the actor for notification messages.
// Notifications are best-effort, so a failed lookup just drops the "by X" line.
async function findActor(actorId) {
  if (!actorId) return null;
  try {
    return await User.findById(actorId).select('_id name');
  } catch {
    return null;
  }
}

async function ensureAssignableUser(userId) {
  if (!userId) return;
  const u = await User.findById(userId);
  if (!u) throw ApiError.badRequest('Invalid assignedTo user');
}

async function createLead(payload, actorId) {
  await ensureAssignableUser(payload.assignedTo);
  const lead = await Lead.create({ ...payload, createdBy: actorId, updatedBy: actorId });

  // Notify the assignee (unless they assigned the lead to themselves).
  if (lead.assignedTo && lead.assignedTo.toString() !== actorId.toString()) {
    const actor = await findActor(actorId);
    notificationService.leadAssigned({
      lead,
      assigneeId: lead.assignedTo,
      assignedByUser: actor,
    });
  }

  audit('LEAD_CREATED', lead._id, actorId, null, lead.toObject());
  return lead;
}

async function listLeads(q) {
  const {
    page,
    limit,
    search,
    status,
    leadType,
    assignedTo,
    source,
    dateField,
    fromDate,
    toDate,
  } = q;

  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (leadType) filter.leadType = leadType;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (source) filter.source = source;

  if (fromDate || toDate) {
    filter[dateField] = {};
    if (fromDate) filter[dateField].$gte = fromDate;
    if (toDate) filter[dateField].$lte = toDate;
  }

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { leadName: re },
      { hospitalName: re },
      { contactPersonName: re },
      { phone: re },
      { email: re },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name mobileNumber email')
      .populate('convertedCustomerId', 'customerCode customerName hospitalName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getLead(id) {
  const lead = await Lead.findOne({ _id: id, isDeleted: false })
    .populate('assignedTo', 'name mobileNumber email')
    .populate('convertedCustomerId', 'customerCode customerName hospitalName');
  if (!lead) throw ApiError.notFound('Lead not found');
  return lead;
}

async function updateLead(id, payload, actorId) {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.status === 'Converted') {
    throw ApiError.badRequest('Converted leads cannot be modified');
  }
  await ensureAssignableUser(payload.assignedTo);

  const oldValue = lead.toObject();
  const oldAssignee = lead.assignedTo ? lead.assignedTo.toString() : null;

  Object.assign(lead, payload, { updatedBy: actorId });
  await lead.save();

  const newAssignee = lead.assignedTo ? lead.assignedTo.toString() : null;
  const reassigned = newAssignee && newAssignee !== oldAssignee;
  if (reassigned && newAssignee !== actorId.toString()) {
    const actor = await findActor(actorId);
    notificationService.leadAssigned({
      lead,
      assigneeId: lead.assignedTo,
      assignedByUser: actor,
    });
  }

  audit('LEAD_UPDATED', lead._id, actorId, oldValue, lead.toObject());
  return lead;
}

async function setStatus(id, { status, remarks }, actorId) {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.status === 'Converted' && status !== 'Converted') {
    throw ApiError.badRequest('Converted leads cannot change status');
  }
  if (status === 'Converted' && !lead.convertedCustomerId) {
    // Reserve the "Converted" terminal status for the convert-to-customer flow.
    throw ApiError.badRequest('Use POST /leads/:id/convert-to-customer to convert a lead');
  }

  const oldStatus = lead.status;
  lead.status = status;
  if (typeof remarks === 'string') lead.remarks = remarks;
  lead.updatedBy = actorId;
  await lead.save();
  audit('LEAD_STATUS_CHANGED', lead._id, actorId, { status: oldStatus }, { status: lead.status });
  return lead;
}

async function softDeleteLead(id, actorId) {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) throw ApiError.notFound('Lead not found');
  lead.isDeleted = true;
  lead.deletedAt = new Date();
  lead.deletedBy = actorId;
  lead.updatedBy = actorId;
  await lead.save();
  audit('LEAD_DELETED', lead._id, actorId);
  return { deleted: true };
}

// -- Follow-ups -----------------------------------------------------------

async function addFollowUp(leadId, payload, actorId) {
  const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (LEAD_TERMINAL_STATUSES.includes(lead.status)) {
    throw ApiError.badRequest(`Cannot add follow-up: lead is ${lead.status}`);
  }

  const followUp = await LeadFollowUp.create({
    ...payload,
    leadId,
    performedBy: actorId,
    createdBy: actorId,
    updatedBy: actorId,
  });

  // Mirror the next follow-up onto the lead for easy listing.
  if (payload.nextFollowUpDate) {
    lead.followUpDate = payload.nextFollowUpDate;
    lead.updatedBy = actorId;
    await lead.save();
  }

  audit('FOLLOWUP_ADDED', followUp._id, actorId, null, followUp.toObject());
  return followUp;
}

async function listFollowUps(leadId) {
  const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
  if (!lead) throw ApiError.notFound('Lead not found');
  return LeadFollowUp.find({ leadId })
    .populate('performedBy', 'name mobileNumber')
    .sort({ followUpDate: -1, createdAt: -1 });
}

// -- Convert to customer --------------------------------------------------

async function resolveLocation({ stateId, cityId }) {
  const out = {};
  if (stateId) {
    const s = await State.findById(stateId);
    if (!s) throw ApiError.badRequest('Invalid stateId');
    out.stateId = s._id;
    out.stateName = s.name;
  }
  if (cityId) {
    const c = await City.findById(cityId);
    if (!c) throw ApiError.badRequest('Invalid cityId');
    if (stateId && c.stateId.toString() !== stateId) {
      throw ApiError.badRequest('City does not belong to the specified state');
    }
    out.cityId = c._id;
    out.cityName = c.name;
    if (!out.stateId) {
      out.stateId = c.stateId;
      out.stateName = c.stateName;
    }
  }
  return out;
}

async function convertToCustomer(leadId, payload, actorId) {
  const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.status === 'Converted' || lead.convertedCustomerId) {
    throw ApiError.conflict('Lead is already converted');
  }

  // Map lead → customer with optional overrides from the request body.
  const customerName =
    payload.customerName || lead.contactPersonName || lead.leadName;
  const hospitalName = payload.hospitalName || lead.hospitalName || lead.leadName;
  const phone = payload.phone || lead.phone;
  const email = payload.email || lead.email || undefined;
  const address = payload.address || lead.address || '';

  const location = await resolveLocation(payload);
  if (payload.assignedTo) await ensureAssignableUser(payload.assignedTo);

  // Use a session/transaction if available, otherwise just two ordered writes.
  const session = await mongoose.startSession().catch(() => null);
  let customer;
  try {
    if (session) session.startTransaction();

    const customerCode = await nextCode('customer', 'CUST', 5);
    [customer] = await Customer.create(
      [
        {
          customerCode,
          customerName,
          phone,
          email,
          hospitalName,
          gstin: payload.gstin,
          address,
          ...location,
          pincode: payload.pincode,
          customerType: payload.customerType,
          assignedTo: payload.assignedTo || lead.assignedTo,
          status: ROLE_STATUS.ACTIVE,
          createdBy: actorId,
          updatedBy: actorId,
        },
      ],
      session ? { session } : undefined
    );

    lead.status = 'Converted';
    lead.convertedCustomerId = customer._id;
    lead.convertedAt = new Date();
    lead.convertedBy = actorId;
    lead.updatedBy = actorId;
    await lead.save(session ? { session } : undefined);

    if (session) await session.commitTransaction();
  } catch (err) {
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }

  audit('LEAD_CONVERTED', lead._id, actorId, null, {
    convertedCustomerId: customer._id,
    customerCode: customer.customerCode,
  });

  return { lead, customer };
}

module.exports = {
  createLead,
  listLeads,
  getLead,
  updateLead,
  setStatus,
  softDeleteLead,
  addFollowUp,
  listFollowUps,
  convertToCustomer,
};
