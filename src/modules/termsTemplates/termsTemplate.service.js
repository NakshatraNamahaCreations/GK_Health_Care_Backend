const TermsTemplate = require('./termsTemplate.model');
const ApiError = require('../../utils/ApiError');

// Making a template the default un-defaults every other template of the same
// module (per company — the tenant plugin scopes the update).
async function clearOtherDefaults(module, exceptId) {
  const filter = { module, isDeleted: false };
  if (exceptId) filter._id = { $ne: exceptId };
  await TermsTemplate.updateMany(filter, { $set: { isDefault: false } });
}

async function createTemplate(payload, actorId) {
  const doc = await TermsTemplate.create({
    ...payload,
    createdBy: actorId,
    updatedBy: actorId,
  });
  if (doc.isDefault) await clearOtherDefaults(doc.module, doc._id);
  return doc;
}

async function listTemplates({ module }) {
  const filter = { isDeleted: false };
  if (module) filter.module = module;
  return TermsTemplate.find(filter).sort({ module: 1, isDefault: -1, name: 1 });
}

async function updateTemplate(id, payload, actorId) {
  const doc = await TermsTemplate.findOne({ _id: id, isDeleted: false });
  if (!doc) throw ApiError.notFound('Terms template not found');

  for (const key of ['name', 'module', 'content', 'isDefault']) {
    if (payload[key] !== undefined) doc[key] = payload[key];
  }
  doc.updatedBy = actorId;
  await doc.save();
  if (doc.isDefault) await clearOtherDefaults(doc.module, doc._id);
  return doc;
}

async function deleteTemplate(id, actorId) {
  const doc = await TermsTemplate.findOne({ _id: id, isDeleted: false });
  if (!doc) throw ApiError.notFound('Terms template not found');
  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.deletedBy = actorId;
  doc.isDefault = false;
  await doc.save();
  return { deleted: true };
}

module.exports = { createTemplate, listTemplates, updateTemplate, deleteTemplate };
