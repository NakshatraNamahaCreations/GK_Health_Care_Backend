const Customer = require('./customer.model');
const State = require('../locations/state.model');
const City = require('../locations/city.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { ROLE_STATUS } = require('../../constants/status');
const { auditLegacy: audit } = require('../../services/auditService');

// Resolves and denormalizes state/city/assignedTo into the customer doc.
async function resolveDenormalized(payload) {
  const denorm = {};

  if (payload.stateId) {
    const state = await State.findById(payload.stateId);
    if (!state) throw ApiError.badRequest('Invalid stateId');
    denorm.stateId = state._id;
    denorm.stateName = state.name;
  }

  if (payload.cityId) {
    const city = await City.findById(payload.cityId);
    if (!city) throw ApiError.badRequest('Invalid cityId');
    if (payload.stateId && city.stateId.toString() !== payload.stateId) {
      throw ApiError.badRequest('City does not belong to the specified state');
    }
    denorm.cityId = city._id;
    denorm.cityName = city.name;
    // If the caller omitted stateId, infer it from the city.
    if (!denorm.stateId) {
      denorm.stateId = city.stateId;
      denorm.stateName = city.stateName;
    }
  }

  if (payload.assignedTo) {
    const u = await User.findById(payload.assignedTo);
    if (!u) throw ApiError.badRequest('Invalid assignedTo user');
    denorm.assignedTo = u._id;
  }

  return denorm;
}

async function createCustomer(payload, actorId) {
  const denorm = await resolveDenormalized(payload);
  const customerCode = await nextCode('customer', 'CUST', 5);

  const customer = await Customer.create({
    ...payload,
    ...denorm,
    customerCode,
    createdBy: actorId,
    updatedBy: actorId,
  });
  audit('CUSTOMER_CREATED', customer._id, actorId, null, customer.toObject());
  return customer;
}

async function listCustomers(q) {
  const { page, limit, search, status, stateId, cityId, customerType, assignedTo } = q;

  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (stateId) filter.stateId = stateId;
  if (cityId) filter.cityId = cityId;
  if (customerType) filter.customerType = customerType;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { customerName: re },
      { hospitalName: re },
      { phone: re },
      { email: re },
      { customerCode: re },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('assignedTo', 'name mobileNumber email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Customer.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

async function getCustomer(id) {
  const customer = await Customer.findOne({ _id: id, isDeleted: false }).populate(
    'assignedTo',
    'name mobileNumber email'
  );
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

async function updateCustomer(id, payload, actorId) {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found');

  const oldValue = customer.toObject();
  const denorm = await resolveDenormalized(payload);
  Object.assign(customer, payload, denorm, { updatedBy: actorId });
  await customer.save();
  audit('CUSTOMER_UPDATED', customer._id, actorId, oldValue, customer.toObject());
  return customer;
}

async function softDeleteCustomer(id, actorId) {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found');

  customer.isDeleted = true;
  customer.deletedAt = new Date();
  customer.deletedBy = actorId;
  customer.status = ROLE_STATUS.INACTIVE;
  customer.updatedBy = actorId;
  await customer.save();
  audit('CUSTOMER_DELETED', customer._id, actorId);
  return { deleted: true };
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  softDeleteCustomer,
};
