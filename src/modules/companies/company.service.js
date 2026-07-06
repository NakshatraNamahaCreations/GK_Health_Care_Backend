const Company = require('./company.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { ROLE_STATUS } = require('../../constants/status');

// Companies the given request context may access:
//  - super admin  → all companies
//  - employee     → only those in their companyIds
async function listAccessible(req) {
  if (req.role && req.role.isSuperAdmin) {
    return Company.find({ isDeleted: false }).sort({ name: 1 });
  }
  const ids = (req.user && req.user.companyIds) || [];
  return Company.find({ _id: { $in: ids }, isDeleted: false }).sort({ name: 1 });
}

async function listAll() {
  return Company.find({ isDeleted: false }).sort({ name: 1 });
}

async function getById(id) {
  const company = await Company.findOne({ _id: id, isDeleted: false });
  if (!company) throw ApiError.notFound('Company not found');
  return company;
}

async function createCompany(payload, actorId) {
  return Company.create({ ...payload, createdBy: actorId, updatedBy: actorId });
}

async function updateCompany(id, payload, actorId) {
  const company = await Company.findOne({ _id: id, isDeleted: false });
  if (!company) throw ApiError.notFound('Company not found');
  Object.assign(company, payload, { updatedBy: actorId });
  await company.save();
  return company;
}

// Soft-delete: hides the company and unassigns its users. The company's records
// are preserved (they simply become inaccessible) rather than destroyed.
async function deleteCompany(id, actorId) {
  const company = await Company.findOne({ _id: id, isDeleted: false });
  if (!company) throw ApiError.notFound('Company not found');

  const remaining = await Company.countDocuments({ isDeleted: false });
  if (remaining <= 1) {
    throw ApiError.badRequest('Cannot delete the only remaining company');
  }

  company.isDeleted = true;
  company.deletedAt = new Date();
  company.deletedBy = actorId;
  company.status = ROLE_STATUS.INACTIVE;
  company.updatedBy = actorId;
  await company.save();

  // Remove the company from every user's assignments.
  await User.updateMany({ companyIds: id }, { $pull: { companyIds: id } });

  return { deleted: true };
}

module.exports = {
  listAccessible,
  listAll,
  getById,
  createCompany,
  updateCompany,
  deleteCompany,
};
