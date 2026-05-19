const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { EXPENSE_STATUSES } = require('../../constants/financeEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const create = z.object({
  categoryId: objectId,
  amount: z.coerce.number().positive(),
  expenseDate: optionalDate,
  description: z.string().max(2000).optional(),
  attachmentUrl: optionalUrl,
});

const update = create.partial();

const approve = z.object({
  approvalRemarks: z.string().max(2000).optional(),
});

const reject = z.object({
  approvalRemarks: z.string().min(1, 'Reason for rejection is required').max(2000),
});

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  userId: objectId.optional(),
  categoryId: objectId.optional(),
  fromDate: optionalDate,
  toDate: optionalDate,
});

const myQuery = listQuery.omit({ userId: true });

module.exports = { create, update, approve, reject, idParam, listQuery, myQuery };
