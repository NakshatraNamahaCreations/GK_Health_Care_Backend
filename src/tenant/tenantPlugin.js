const mongoose = require('mongoose');
const { getCompanyId, isBypassed } = require('./tenantContext');

// Query middleware that is unambiguously query-level by default.
const QUERY_HOOKS = [
  'count',
  'countDocuments',
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateMany',
  'deleteMany',
];

// These names can be either document or query middleware; register them
// explicitly as query middleware so Model.updateOne/deleteOne/replaceOne
// still get the tenant filter.
const AMBIGUOUS_QUERY_HOOKS = ['updateOne', 'deleteOne', 'replaceOne'];

/**
 * Makes a model multi-tenant:
 *  - adds an indexed `companyId` field,
 *  - stamps it from the active tenant context on create/save,
 *  - injects a `companyId` filter into every query and aggregation.
 *
 * When there is no active company in context (e.g. seed scripts) or the context
 * is explicitly bypassed, no filtering is applied — so migrations and
 * super-admin tooling can operate across all tenants deliberately.
 */
function tenantPlugin(schema) {
  schema.add({
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
  });

  // Stamp companyId on new documents.
  schema.pre('save', function (next) {
    if (!this.companyId && !isBypassed()) {
      const cid = getCompanyId();
      if (cid) this.companyId = cid;
    }
    next();
  });

  // Stamp companyId on bulk inserts.
  schema.pre('insertMany', function (next, docs) {
    if (!isBypassed()) {
      const cid = getCompanyId();
      if (cid && Array.isArray(docs)) {
        docs.forEach((doc) => {
          if (doc && !doc.companyId) doc.companyId = cid;
        });
      }
    }
    next();
  });

  // Inject companyId filter into all query types.
  const applyFilter = function (next) {
    if (!isBypassed()) {
      const cid = getCompanyId();
      if (cid) {
        const q = this.getQuery();
        if (q.companyId === undefined) this.where({ companyId: cid });
      }
    }
    next();
  };

  QUERY_HOOKS.forEach((hook) => {
    schema.pre(hook, applyFilter);
  });
  AMBIGUOUS_QUERY_HOOKS.forEach((hook) => {
    schema.pre(hook, { query: true, document: false }, applyFilter);
  });

  // Inject companyId match at the head of aggregation pipelines.
  schema.pre('aggregate', function (next) {
    if (!isBypassed()) {
      const cid = getCompanyId();
      if (cid) {
        const pipeline = this.pipeline();
        const first = pipeline[0] || {};
        const alreadyScoped =
          first.$match && Object.prototype.hasOwnProperty.call(first.$match, 'companyId');
        if (!alreadyScoped) pipeline.unshift({ $match: { companyId: cid } });
      }
    }
    next();
  });
}

module.exports = { tenantPlugin };
