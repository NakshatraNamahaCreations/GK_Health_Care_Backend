const { z } = require('zod');
const { OBJECT_ID, PHONE_IN, PINCODE_IN, GSTIN } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');
const { CUSTOMER_TYPES } = require('../../constants/customerTypes');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const statusEnum = z.enum(ROLE_STATUS_VALUES);

const optionalEmail = z
  .string()
  .email('Invalid email')
  .optional()
  .or(z.literal('').transform(() => undefined));

const optionalGstin = z
  .string()
  .regex(GSTIN, 'Invalid GSTIN')
  .optional()
  .or(z.literal('').transform(() => undefined));

const optionalPincode = z
  .string()
  .regex(PINCODE_IN, 'Invalid pincode')
  .optional()
  .or(z.literal('').transform(() => undefined));

const create = z.object({
  customerName: z.string().min(2).max(120),
  phone: z.string().regex(PHONE_IN, 'Invalid phone'),
  email: optionalEmail,
  hospitalName: z.string().min(2).max(200),
  gstin: optionalGstin,
  address: z.string().max(500).optional(),
  stateId: objectId.optional(),
  cityId: objectId.optional(),
  pincode: optionalPincode,
  customerType: z.enum(CUSTOMER_TYPES),
  assignedTo: objectId.optional(),
  status: statusEnum.optional(),
});

const update = z.object({
  customerName: z.string().min(2).max(120).optional(),
  phone: z.string().regex(PHONE_IN, 'Invalid phone').optional(),
  email: optionalEmail,
  hospitalName: z.string().min(2).max(200).optional(),
  gstin: optionalGstin,
  address: z.string().max(500).optional(),
  stateId: objectId.optional(),
  cityId: objectId.optional(),
  pincode: optionalPincode,
  customerType: z.enum(CUSTOMER_TYPES).optional(),
  assignedTo: objectId.optional(),
  status: statusEnum.optional(),
});

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
  stateId: objectId.optional(),
  cityId: objectId.optional(),
  customerType: z.enum(CUSTOMER_TYPES).optional(),
  assignedTo: objectId.optional(),
});

module.exports = { create, update, idParam, listQuery };
