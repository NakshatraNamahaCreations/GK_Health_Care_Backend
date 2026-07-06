const mongoose = require('mongoose');
const Company = require('../modules/companies/company.model');

const HEADER = 'x-company-id';

function isValidId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Determines which company a request operates on:
 *  - Super admin: the company named in the X-Company-Id header (if it exists),
 *    otherwise the first company. Super admins can reach any tenant.
 *  - Employee: the header company only if it is one they belong to, otherwise
 *    their first assigned company.
 *
 * Returns an ObjectId or null (null → no company context, e.g. no companies yet).
 */
async function resolveActiveCompany(req) {
  const headerId = req.headers[HEADER];
  const isSuperAdmin = Boolean(req.role && req.role.isSuperAdmin);

  if (isSuperAdmin) {
    if (isValidId(headerId)) {
      const exists = await Company.exists({ _id: headerId, isDeleted: false });
      if (exists) return new mongoose.Types.ObjectId(headerId);
    }
    const first = await Company.findOne({ isDeleted: false })
      .sort({ createdAt: 1 })
      .select('_id');
    return first ? first._id : null;
  }

  const memberIds = ((req.user && req.user.companyIds) || []).map((id) => id.toString());
  if (isValidId(headerId) && memberIds.includes(headerId)) {
    return new mongoose.Types.ObjectId(headerId);
  }
  if (memberIds.length > 0) {
    return new mongoose.Types.ObjectId(memberIds[0]);
  }
  return null;
}

module.exports = { resolveActiveCompany, COMPANY_HEADER: HEADER };
