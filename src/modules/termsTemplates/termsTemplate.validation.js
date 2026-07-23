const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const TermsTemplate = require('./termsTemplate.model');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const moduleEnum = z.enum(TermsTemplate.TERMS_MODULES);

const create = z.object({
  name: z.string().trim().min(2).max(120),
  module: moduleEnum,
  content: z.string().trim().min(1, 'Content is required').max(10000),
  isDefault: z.coerce.boolean().optional(),
});

const update = create.partial();

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  module: moduleEnum.optional(),
});

module.exports = { create, update, idParam, listQuery };
