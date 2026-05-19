const { z } = require('zod');
const { MODULE_KEYS } = require('../../constants/modules');
const { ROLE_STATUS_VALUES } = require('../../constants/status');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// moduleName is auto-filled by the schema pre-validate hook, so it's optional on input.
const permission = z
  .object({
    moduleKey: z.enum(MODULE_KEYS),
    moduleName: z.string().optional(),
    read: z.boolean().default(false),
    write: z.boolean().default(false),
  })
  .refine((p) => !p.write || p.read, {
    path: ['write'],
    message: 'Write permission requires read permission',
  });

// Ensure no duplicate moduleKey entries.
const permissionsArray = z.array(permission).superRefine((perms, ctx) => {
  const seen = new Set();
  perms.forEach((p, i) => {
    if (seen.has(p.moduleKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, 'moduleKey'],
        message: `Duplicate permission for module: ${p.moduleKey}`,
      });
    }
    seen.add(p.moduleKey);
  });
});

const statusEnum = z.enum(ROLE_STATUS_VALUES);

const create = z.object({
  roleName: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  status: statusEnum.optional(),
  permissions: permissionsArray.optional().default([]),
});

const update = z.object({
  roleName: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  permissions: permissionsArray.optional(),
});

const updateStatus = z.object({ status: statusEnum });

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
});

module.exports = { create, update, updateStatus, idParam, listQuery };
