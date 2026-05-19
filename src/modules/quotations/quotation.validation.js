const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const {
  QUOTATION_STATUSES,
  QUOTATION_ITEM_TYPES,
} = require('../../constants/quotationEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();

const item = z.object({
  itemType: z.enum(QUOTATION_ITEM_TYPES),
  itemId: objectId.optional(),
  name: z.string().min(1).max(200),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().optional().default(0),
  gstPercentage: z.coerce.number().min(0).max(100).optional().default(0),
});

const create = z.object({
  quotationDate: optionalDate,
  customerId: objectId,
  leadId: objectId.optional(),
  items: z.array(item).min(1, 'At least one item is required'),
  freightCharges: z.coerce.number().nonnegative().optional().default(0),
  terms: z.string().max(4000).optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
});

const update = z.object({
  quotationDate: optionalDate,
  items: z.array(item).optional(),
  freightCharges: z.coerce.number().nonnegative().optional(),
  terms: z.string().max(4000).optional(),
});

const updateStatus = z.object({
  status: z.enum(QUOTATION_STATUSES),
  remarks: z.string().max(2000).optional(),
});

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
  customerId: objectId.optional(),
  leadId: objectId.optional(),
  fromDate: optionalDate,
  toDate: optionalDate,
});

module.exports = { create, update, updateStatus, idParam, listQuery };
