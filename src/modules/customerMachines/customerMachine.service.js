const CustomerMachine = require('./customerMachine.model');
const Customer = require('../customers/customer.model');
const Product = require('../products/product.model');
const ApiError = require('../../utils/ApiError');
const { ROLE_STATUS } = require('../../constants/status');

async function assertCustomer(customerId) {
  const c = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!c) throw ApiError.badRequest('Invalid customerId');
  return c;
}

async function maybeAssertProduct(productId) {
  if (!productId) return null;
  const p = await Product.findOne({ _id: productId, isDeleted: false });
  if (!p) throw ApiError.badRequest('Invalid productId');
  return p;
}

async function createMachine(payload, actorId) {
  await assertCustomer(payload.customerId);
  await maybeAssertProduct(payload.productId);

  if (payload.serialNumber) {
    const dupe = await CustomerMachine.findOne({
      serialNumber: payload.serialNumber,
      isDeleted: false,
    });
    if (dupe) throw ApiError.conflict('Serial number already exists');
  }

  return CustomerMachine.create({ ...payload, createdBy: actorId, updatedBy: actorId });
}

async function listMachines(q) {
  const { page, limit, search, ...rest } = q;
  const filter = { isDeleted: false };
  for (const key of [
    'customerId',
    'productId',
    'machineStatus',
    'serviceType',
    'status',
  ]) {
    if (rest[key]) filter[key] = rest[key];
  }
  if (rest.dueBefore) filter.nextServiceDueDate = { $lte: rest.dueBefore };

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { machineName: re },
      { modelNumber: re },
      { manufacturer: re },
      { serialNumber: re },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CustomerMachine.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName phone')
      .populate('productId', 'productCode productName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CustomerMachine.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function listByCustomer(customerId) {
  await assertCustomer(customerId);
  return CustomerMachine.find({ customerId, isDeleted: false })
    .populate('productId', 'productCode productName')
    .sort({ createdAt: -1 });
}

async function getMachine(id) {
  const machine = await CustomerMachine.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName phone')
    .populate('productId', 'productCode productName');
  if (!machine) throw ApiError.notFound('Customer machine not found');
  return machine;
}

async function updateMachine(id, payload, actorId) {
  const machine = await CustomerMachine.findOne({ _id: id, isDeleted: false });
  if (!machine) throw ApiError.notFound('Customer machine not found');

  if (payload.customerId) await assertCustomer(payload.customerId);
  if (payload.productId) await maybeAssertProduct(payload.productId);

  if (payload.serialNumber && payload.serialNumber !== machine.serialNumber) {
    const dupe = await CustomerMachine.findOne({
      serialNumber: payload.serialNumber,
      isDeleted: false,
      _id: { $ne: id },
    });
    if (dupe) throw ApiError.conflict('Serial number already exists');
  }

  Object.assign(machine, payload, { updatedBy: actorId });
  await machine.save();
  return machine;
}

async function softDeleteMachine(id, actorId) {
  const machine = await CustomerMachine.findOne({ _id: id, isDeleted: false });
  if (!machine) throw ApiError.notFound('Customer machine not found');
  machine.isDeleted = true;
  machine.deletedAt = new Date();
  machine.deletedBy = actorId;
  machine.status = ROLE_STATUS.INACTIVE;
  machine.updatedBy = actorId;
  await machine.save();
  return { deleted: true };
}

module.exports = {
  createMachine,
  listMachines,
  listByCustomer,
  getMachine,
  updateMachine,
  softDeleteMachine,
};
