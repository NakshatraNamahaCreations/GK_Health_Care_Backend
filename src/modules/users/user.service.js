const User = require('./user.model');
const Role = require('../roles/role.model');
const ApiError = require('../../utils/ApiError');
const { auditLegacy: audit } = require('../../services/auditService');

async function assertRoleExists(roleId) {
  const role = await Role.findById(roleId);
  if (!role) throw ApiError.badRequest('Invalid roleId');
  return role;
}

async function createUser(payload, actorId) {
  await assertRoleExists(payload.roleId);

  const exists = await User.findOne({ mobileNumber: payload.mobileNumber });
  if (exists) throw ApiError.conflict('Mobile number already in use');

  if (payload.email) {
    const e = await User.findOne({ email: payload.email });
    if (e) throw ApiError.conflict('Email already in use');
  }

  const user = await User.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  audit('USER_CREATED', user._id, actorId, null, user.toJSON());
  return User.findById(user._id).populate('roleId');
}

async function listUsers({ page, limit, search, roleId, status }) {
  const filter = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { mobileNumber: re }, { email: re }];
  }
  if (roleId) filter.roleId = roleId;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).populate('roleId').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

async function getUser(id) {
  const user = await User.findById(id).populate('roleId');
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function updateUser(id, payload, actorId) {
  if (payload.roleId) await assertRoleExists(payload.roleId);

  if (payload.email) {
    const dupe = await User.findOne({ email: payload.email, _id: { $ne: id } });
    if (dupe) throw ApiError.conflict('Email already in use');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { ...payload, updatedBy: actorId },
    { new: true, runValidators: true }
  ).populate('roleId');

  if (!user) throw ApiError.notFound('User not found');
  audit('USER_UPDATED', user._id, actorId, null, user.toJSON());
  return user;
}

async function setStatus(id, status, actorId) {
  const user = await User.findByIdAndUpdate(
    id,
    { status, updatedBy: actorId },
    { new: true }
  ).populate('roleId');
  if (!user) throw ApiError.notFound('User not found');
  audit('USER_STATUS_CHANGED', user._id, actorId, null, { status });
  return user;
}

async function resetPassword(id, newPassword, actorId) {
  const user = await User.findById(id).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  user.password = newPassword; // re-hashed by pre-save hook
  user.passwordResetRequired = true; // force change on next login
  user.updatedBy = actorId;
  await user.save();
  audit('USER_PASSWORD_RESET', user._id, actorId);
  return { updated: true };
}

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  setStatus,
  resetPassword,
};
