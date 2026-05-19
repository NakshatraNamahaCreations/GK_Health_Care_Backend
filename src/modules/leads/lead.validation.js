const { z } = require('zod');
const { OBJECT_ID, PHONE_IN, PINCODE_IN, GSTIN } = require('../../constants/regex');
const {
  LEAD_STATUSES,
  LEAD_TYPES,
  FOLLOWUP_OUTCOMES,
  FOLLOWUP_CHANNELS,
} = require('../../constants/leadEnums');
const { CUSTOMER_TYPES } = require('../../constants/customerTypes');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');

const optionalEmail = z
  .string()
  .email('Invalid email')
  .optional()
  .or(z.literal('').transform(() => undefined));

const optionalPhone = z
  .string()
  .regex(PHONE_IN, 'Invalid alternatePhone')
  .optional()
  .or(z.literal('').transform(() => undefined));

const optionalDate = z.coerce.date().optional();

const create = z.object({
  leadName: z.string().min(2).max(200),
  hospitalName: z.string().max(200).optional(),
  contactPersonName: z.string().max(150).optional(),
  phone: z.string().regex(PHONE_IN, 'Invalid phone'),
  alternatePhone: optionalPhone,
  email: optionalEmail,
  source: z.string().max(100).optional(),
  leadType: z.enum(LEAD_TYPES).optional(),
  leadValue: z.coerce.number().nonnegative().optional(),
  requirementType: z.string().max(150).optional(),
  interestedProduct: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  followUpDate: optionalDate,
  assignedTo: objectId.optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  remarks: z.string().max(2000).optional(),
});

const update = create.partial();

const updateStatus = z.object({
  status: z.enum(LEAD_STATUSES),
  remarks: z.string().max(2000).optional(),
});

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  leadType: z.enum(LEAD_TYPES).optional(),
  assignedTo: objectId.optional(),
  source: z.string().trim().optional(),
  // Date filter — bounds checked against createdAt by default.
  dateField: z.enum(['createdAt', 'followUpDate']).optional().default('createdAt'),
  fromDate: optionalDate,
  toDate: optionalDate,
});

// Follow-ups
const createFollowUp = z.object({
  followUpDate: z.coerce.date(),
  channel: z.enum(FOLLOWUP_CHANNELS).optional(),
  contactedPerson: z.string().max(150).optional(),
  notes: z.string().max(2000).optional(),
  outcome: z.enum(FOLLOWUP_OUTCOMES).optional(),
  nextFollowUpDate: optionalDate,
});

// Convert-to-customer body — needs the data the Lead doesn't carry.
const convertToCustomer = z.object({
  customerType: z.enum(CUSTOMER_TYPES),
  stateId: objectId.optional(),
  cityId: objectId.optional(),
  pincode: z
    .string()
    .regex(PINCODE_IN, 'Invalid pincode')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  gstin: z
    .string()
    .regex(GSTIN, 'Invalid GSTIN')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  assignedTo: objectId.optional(),
  // Optional overrides if caller wants to refine before creating the customer.
  customerName: z.string().min(2).max(120).optional(),
  hospitalName: z.string().min(2).max(200).optional(),
  email: optionalEmail,
  phone: z.string().regex(PHONE_IN, 'Invalid phone').optional(),
  address: z.string().max(500).optional(),
});

module.exports = {
  create,
  update,
  updateStatus,
  idParam,
  listQuery,
  createFollowUp,
  convertToCustomer,
};
