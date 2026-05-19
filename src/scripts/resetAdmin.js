// One-shot cleanup: removes the seeded Super Admin role + first admin user
// so `npm run seed` can recreate them with the current schema (roleId, etc.).
//
// Run once:
//   node src/scripts/resetAdmin.js
// Then:
//   npm run seed

require('../config/env');
const logger = require('../config/logger');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');

async function run() {
  const mobile = process.env.SEED_ADMIN_MOBILE || '9999999999';
  try {
    await connectDB();

    const userRes = await User.deleteOne({ mobileNumber: mobile });
    logger.info(`Removed admin user (mobile=${mobile}): deletedCount=${userRes.deletedCount}`);

    const roleRes = await Role.deleteOne({ isSuperAdmin: true });
    logger.info(`Removed Super Admin role: deletedCount=${roleRes.deletedCount}`);

    logger.info('Reset complete. Run `npm run seed` next.');
  } catch (err) {
    logger.error(`Reset failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

run();
