const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { USER_STATUS, ROLE_STATUS } = require('../../constants/status');

function signTokens(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.roleId?._id ? user.roleId._id.toString() : undefined,
  };
  const accessToken = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret || env.jwt.secret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

// Shapes the user object the way API_CONTRACTS expects in the login/me response.
function shapeUserForAuth(user) {
  const role = user.roleId;
  return {
    _id: user._id,
    name: user.name,
    mobileNumber: user.mobileNumber,
    email: user.email,
    department: user.department,
    designation: user.designation,
    profileImage: user.profileImage,
    status: user.status,
    passwordResetRequired: user.passwordResetRequired,
    lastLoginAt: user.lastLoginAt,
    role: role
      ? {
          _id: role._id,
          roleName: role.roleName,
          isSuperAdmin: role.isSuperAdmin,
          status: role.status,
          permissions: role.permissions,
        }
      : null,
  };
}

async function login({ mobileNumber, password }) {
  // Must explicitly select password since it's `select:false` on the model.
  const user = await User.findOne({ mobileNumber }).select('+password').populate('roleId');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden(`User is ${user.status.toLowerCase()}`);
  }
  if (!user.roleId) throw ApiError.forbidden('User has no role assigned');
  if (user.roleId.status !== ROLE_STATUS.ACTIVE) {
    throw ApiError.forbidden('User role is inactive');
  }

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = signTokens(user);
  return { user: shapeUserForAuth(user), ...tokens };
}

async function me(userId) {
  const user = await User.findById(userId).populate('roleId');
  if (!user) throw ApiError.notFound('User not found');
  return shapeUserForAuth(user);
}

async function changePassword(userId, { oldPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await user.comparePassword(oldPassword);
  if (!ok) throw ApiError.badRequest('Old password is incorrect');

  user.password = newPassword; // pre-save hook re-hashes
  user.passwordResetRequired = false;
  await user.save();
  return { updated: true };
}

module.exports = { login, me, changePassword };
