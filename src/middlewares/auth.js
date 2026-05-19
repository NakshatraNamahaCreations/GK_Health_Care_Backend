const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');
const { USER_STATUS } = require('../constants/status');
const { ROLE_STATUS } = require('../constants/status');

// Verifies the JWT, loads the user + role, and rejects inactive/blocked users
// or inactive roles. Populates req.user (User doc) and req.role (Role doc).
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing or invalid Authorization header');

    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await User.findById(payload.sub).populate('roleId');
    if (!user) throw ApiError.unauthorized('User not found');
    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden(`User is ${user.status.toLowerCase()}`);
    }
    if (!user.roleId) throw ApiError.forbidden('User has no role assigned');
    if (user.roleId.status !== ROLE_STATUS.ACTIVE) {
      throw ApiError.forbidden('User role is inactive');
    }

    req.user = user;
    req.role = user.roleId;
    return next();
  } catch (err) {
    return next(err);
  }
}

// RBAC enforcement: checkPermission('customers', 'read')
// Super Admin bypasses all checks.
function checkPermission(moduleKey, action) {
  if (!['read', 'write'].includes(action)) {
    throw new Error(`checkPermission: invalid action "${action}"`);
  }
  return (req, res, next) => {
    try {
      const role = req.role;
      if (!role) throw ApiError.forbidden('No role context');
      if (role.isSuperAdmin) return next();
      if (!role.hasPermission(moduleKey, action)) {
        throw ApiError.forbidden(`Missing ${action} permission for ${moduleKey}`);
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// Convenience guard: route only available to Super Admin.
function superAdminOnly(req, res, next) {
  if (req.role && req.role.isSuperAdmin) return next();
  return next(ApiError.forbidden('Super Admin only'));
}

module.exports = { authenticate, checkPermission, superAdminOnly };

// Ensure Role model is registered when this middleware loads.
void Role;
