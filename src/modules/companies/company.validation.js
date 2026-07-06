const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');

const create = z.object({
  name: z.string().min(2).max(200),
  tagline: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(100).optional(),
  email: z.string().max(150).optional(),
  gstin: z.string().max(30).optional(),
  stateName: z.string().max(100).optional(),
  stateCode: z.string().max(10).optional(),
  logoUrl: z.string().max(1000).optional(),
  status: z.enum(ROLE_STATUS_VALUES).optional(),
});

const update = create.partial();

const idParam = z.object({ id: objectId });

module.exports = { create, update, idParam };
