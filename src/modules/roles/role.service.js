const Role = require('./role.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { ROLE_STATUS, USER_STATUS } = require('../../constants/status');
const { auditLegacy: audit } = require('../../services/auditService');

async function createRole(payload, actorId) {
  const dupe = await Role.findOne({ roleName: payload.roleName });
  if (dupe) throw ApiError.conflict('Role name already exists');

  // isSuperAdmin can only ever be set via seed, not via API.
  const role = await Role.create({
    ...payload,
    isSuperAdmin: false,
    createdBy: actorId,
    updatedBy: actorId,
  });
  audit('ROLE_CREATED', role._id, actorId, null, role.toObject());
  return role;
}

async function listRoles({ page, limit, search, status }) {
  const filter = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.roleName = re;
  }
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Role.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Role.countDocuments(filter),
  ]);
  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

async function getRole(id) {
  const role = await Role.findById(id);
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

async function updateRole(id, payload, actorId) {
  const role = await Role.findById(id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSuperAdmin) throw ApiError.forbidden('Super Admin role cannot be modified');

  if (payload.roleName && payload.roleName !== role.roleName) {
    const dupe = await Role.findOne({ roleName: payload.roleName, _id: { $ne: id } });
    if (dupe) throw ApiError.conflict('Role name already exists');
  }

  const oldValue = role.toObject();
  Object.assign(role, payload, { updatedBy: actorId });
  await role.save();
  audit('ROLE_UPDATED', role._id, actorId, oldValue, role.toObject());
  return role;
}

async function setStatus(id, status, actorId) {
  const role = await Role.findById(id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSuperAdmin) throw ApiError.forbidden('Super Admin role status cannot be changed');

  // Optional safeguard: block deactivating a role still in use by active users.
  if (status === ROLE_STATUS.INACTIVE) {
    const inUse = await User.countDocuments({ roleId: id, status: USER_STATUS.ACTIVE });
    if (inUse > 0) {
      throw ApiError.badRequest(`Cannot deactivate: ${inUse} active user(s) hold this role`);
    }
  }

  role.status = status;
  role.updatedBy = actorId;
  await role.save();
  audit('ROLE_STATUS_CHANGED', role._id, actorId, null, { status });
  return role;
}

module.exports = { createRole, listRoles, getRole, updateRole, setStatus };
