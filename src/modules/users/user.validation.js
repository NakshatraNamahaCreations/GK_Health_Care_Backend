const { z } = require('zod');
const { USER_STATUS_VALUES, USER_STATUS } = require('../../constants/status');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const mobile = z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number');
const password = z.string().min(6, 'Password must be at least 6 characters');
const emailField = z
  .string()
  .email('Invalid email')
  .optional()
  .or(z.literal('').transform(() => undefined));

const statusEnum = z.enum(USER_STATUS_VALUES);

const create = z.object({
  name: z.string().min(2).max(100),
  mobileNumber: mobile,
  email: emailField,
  password,
  roleId: objectId,
  companyIds: z.array(objectId).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  profileImage: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  status: statusEnum.optional().default(USER_STATUS.ACTIVE),
});

const update = z.object({
  name: z.string().min(2).max(100).optional(),
  email: emailField,
  roleId: objectId.optional(),
  companyIds: z.array(objectId).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  profileImage: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

const updateStatus = z.object({ status: statusEnum });

const resetPassword = z.object({ newPassword: password });

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  roleId: objectId.optional(),
  status: statusEnum.optional(),
});

module.exports = { create, update, updateStatus, resetPassword, idParam, listQuery };
