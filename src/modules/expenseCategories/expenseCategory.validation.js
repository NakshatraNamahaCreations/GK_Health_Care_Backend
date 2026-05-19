const { z } = require('zod');
const { ROLE_STATUS_VALUES } = require('../../constants/status');

const statusEnum = z.enum(ROLE_STATUS_VALUES);

const create = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  status: statusEnum.optional(),
});

const listQuery = z.object({
  status: statusEnum.optional(),
  search: z.string().trim().optional(),
});

module.exports = { create, listQuery };
