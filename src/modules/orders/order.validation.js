const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { ORDER_STATUSES } = require('./order.model');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  customerId: objectId.optional(),
});

const updateStatus = z.object({
  status: z.enum(ORDER_STATUSES),
});

module.exports = { idParam, listQuery, updateStatus };
