const { z } = require('zod');
const { OBJECT_ID } = require('../../../constants/regex');
const { REPORT_STATUSES, REPORT_KINDS } = require('../../../constants/reportEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();

// Listing is per-kind for clean RBAC scoping; `type` is required.
const listQuery = z.object({
  type: z.enum([
    REPORT_KINDS.INSTALLATION,
    REPORT_KINDS.SERVICE,
    REPORT_KINDS.PM,
    REPORT_KINDS.INSPECTION,
    REPORT_KINDS.INCIDENT,
  ]),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  customerId: objectId.optional(),
  customerMachineId: objectId.optional(),
  technicianId: objectId.optional(),
  fromDate: optionalDate,
  toDate: optionalDate,
});

const idParam = z.object({ id: objectId });

module.exports = { listQuery, idParam };
