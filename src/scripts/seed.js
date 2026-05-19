/**
 * Seed: creates the Super Admin role and the first admin user if they don't already exist.
 *
 * Run:
 *   npm run seed
 *
 * Configure the first admin via env vars (with sensible defaults for dev):
 *   SEED_ADMIN_NAME, SEED_ADMIN_MOBILE, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */
const env = require('../config/env');
const logger = require('../config/logger');
const { connectDB, disconnectDB } = require('../config/db');
const Role = require('../modules/roles/role.model');
const User = require('../modules/users/user.model');
const { APP_MODULES } = require('../constants/modules');
const { USER_STATUS, ROLE_STATUS } = require('../constants/status');

const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

async function ensureSuperAdminRole() {
  let role = await Role.findOne({ isSuperAdmin: true });
  if (role) {
    logger.info(`Super Admin role exists (id=${role._id})`);
    return role;
  }

  // Permissions are irrelevant since isSuperAdmin bypasses checks,
  // but populate the matrix as full read+write for clarity.
  const permissions = APP_MODULES.map((m) => ({
    moduleKey: m.moduleKey,
    moduleName: m.moduleName,
    read: true,
    write: true,
  }));

  role = await Role.create({
    roleName: SUPER_ADMIN_ROLE_NAME,
    description: 'Full access. Bypasses all permission checks.',
    isSuperAdmin: true,
    status: ROLE_STATUS.ACTIVE,
    permissions,
  });
  logger.info(`Created Super Admin role (id=${role._id})`);
  return role;
}

async function ensureFirstAdminUser(role) {
  const mobileNumber = process.env.SEED_ADMIN_MOBILE || '9999999999';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@gkhealthcare.local';
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

  const existing = await User.findOne({ mobileNumber });
  if (existing) {
    logger.info(`Admin user already exists (mobile=${mobileNumber}, id=${existing._id})`);
    return existing;
  }

  const user = await User.create({
    name,
    mobileNumber,
    email,
    password,
    roleId: role._id,
    department: 'Administration',
    designation: 'Administrator',
    status: USER_STATUS.ACTIVE,
    passwordResetRequired: false,
  });

  logger.info('First admin user created:');
  logger.info(`  name:         ${name}`);
  logger.info(`  mobileNumber: ${mobileNumber}`);
  logger.info(`  email:        ${email}`);
  logger.info(`  password:     ${password}   <-- change immediately after first login`);
  return user;
}

async function run() {
  try {
    await connectDB();
    const role = await ensureSuperAdminRole();
    await ensureFirstAdminUser(role);
    logger.info('Seed complete.');
  } catch (err) {
    logger.error(`Seed failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void env; // ensure env is loaded
run();
