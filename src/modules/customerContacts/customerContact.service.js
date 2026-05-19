const CustomerContact = require('./customerContact.model');
const Customer = require('../customers/customer.model');
const ApiError = require('../../utils/ApiError');
const { ROLE_STATUS } = require('../../constants/status');

async function assertCustomerExists(customerId) {
  const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!customer) throw ApiError.badRequest('Invalid customerId');
  return customer;
}

async function createContact(payload, actorId) {
  await assertCustomerExists(payload.customerId);
  return CustomerContact.create({
    ...payload,
    createdBy: actorId,
    updatedBy: actorId,
  });
}

async function listByCustomer(customerId) {
  await assertCustomerExists(customerId);
  return CustomerContact.find({ customerId, isDeleted: false }).sort({ createdAt: -1 });
}

async function updateContact(id, payload, actorId) {
  const contact = await CustomerContact.findOne({ _id: id, isDeleted: false });
  if (!contact) throw ApiError.notFound('Contact not found');
  Object.assign(contact, payload, { updatedBy: actorId });
  await contact.save();
  return contact;
}

async function softDeleteContact(id, actorId) {
  const contact = await CustomerContact.findOne({ _id: id, isDeleted: false });
  if (!contact) throw ApiError.notFound('Contact not found');
  contact.isDeleted = true;
  contact.deletedAt = new Date();
  contact.deletedBy = actorId;
  contact.status = ROLE_STATUS.INACTIVE;
  contact.updatedBy = actorId;
  await contact.save();
  return { deleted: true };
}

module.exports = { createContact, listByCustomer, updateContact, softDeleteContact };
