const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { OUTSTANDING_STATUSES } = require('../../constants/financeEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();

const create = z.object({
  customerId: objectId,
  invoiceNumber: z.string().min(1).max(80),
  invoiceDate: z.coerce.date(),
  invoiceAmount: z.coerce.number().nonnegative(),
  dueDate: optionalDate,
});

const idParam = z.object({ id: objectId });
const customerIdParam = z.object({ customerId: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(OUTSTANDING_STATUSES).optional(),
  customerId: objectId.optional(),
  overdueOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : !!v)),
});

module.exports = { create, idParam, customerIdParam, listQuery };
