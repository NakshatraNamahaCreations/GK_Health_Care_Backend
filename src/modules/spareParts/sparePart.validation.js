const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const statusEnum = z.enum(ROLE_STATUS_VALUES);

const create = z.object({
  partName: z.string().min(2).max(200),
  compatibleMachine: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  manufacturer: z.string().max(150).optional(),
  rate: z.coerce.number().nonnegative().optional(),
  gstPercentage: z.coerce.number().min(0).max(100).optional(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  description: z.string().max(2000).optional(),
  status: statusEnum.optional(),
});

const update = create.partial();
const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
  category: z.string().trim().optional(),
  compatibleMachine: z.string().trim().optional(),
});

module.exports = { create, update, idParam, listQuery };
