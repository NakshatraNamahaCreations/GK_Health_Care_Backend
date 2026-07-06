const Company = require('../companies/company.model');
const ApiError = require('../../utils/ApiError');
const { getCompanyId } = require('../../tenant/tenantContext');

// "Company settings" now maps to the active company (resolved from the tenant
// context). This keeps the Settings > Company details card and the quotation
// print header pointed at whichever company is currently selected.
async function getSettings() {
  const cid = getCompanyId();
  if (!cid) return null;
  return Company.findById(cid);
}

async function updateSettings(payload, actorId) {
  const cid = getCompanyId();
  if (!cid) throw ApiError.badRequest('No active company selected');
  const company = await Company.findByIdAndUpdate(
    cid,
    { ...payload, updatedBy: actorId },
    { new: true }
  );
  if (!company) throw ApiError.notFound('Company not found');
  return company;
}

module.exports = { getSettings, updateSettings };
