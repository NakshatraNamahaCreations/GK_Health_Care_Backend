const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { PAYMENT_MODES } = require('../../constants/financeEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();

const create = z.object({
  customerId: objectId,
  invoiceNumber: z.string().max(80).optional(),
  paymentDate: optionalDate,
  amount: z.coerce.number().positive(),
  paymentMode: z.enum(PAYMENT_MODES),
  bankName: z.string().max(120).optional(),
  transactionId: z.string().max(120).optional(),
  paymentTerms: z.string().max(500).optional(),
  remarks: z.string().max(2000).optional(),
});

const idParam = z.object({ id: objectId });
const customerIdParam = z.object({ customerId: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  customerId: objectId.optional(),
  fromDate: optionalDate,
  toDate: optionalDate,
});

module.exports = { create, idParam, customerIdParam, listQuery };
