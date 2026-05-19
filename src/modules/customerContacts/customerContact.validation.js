const { z } = require('zod');
const { OBJECT_ID, PHONE_IN } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const statusEnum = z.enum(ROLE_STATUS_VALUES);

const optionalEmail = z
  .string()
  .email('Invalid email')
  .optional()
  .or(z.literal('').transform(() => undefined));

const create = z.object({
  customerId: objectId,
  name: z.string().min(2).max(100),
  phone: z.string().regex(PHONE_IN, 'Invalid phone'),
  email: optionalEmail,
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  remarks: z.string().max(500).optional(),
  status: statusEnum.optional(),
});

const update = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(PHONE_IN, 'Invalid phone').optional(),
  email: optionalEmail,
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  remarks: z.string().max(500).optional(),
  status: statusEnum.optional(),
});

const idParam = z.object({ id: objectId });
const customerIdParam = z.object({ customerId: objectId });

module.exports = { create, update, idParam, customerIdParam };
