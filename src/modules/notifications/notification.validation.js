const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  type: z.string().trim().optional(),
});

const saveFcmToken = z.object({
  token: z.string().min(10).max(500),
});

module.exports = { idParam, listQuery, saveFcmToken };
