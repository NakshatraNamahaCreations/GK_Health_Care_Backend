const { z } = require('zod');
const { OBJECT_ID } = require('../../../constants/regex');
const { REPORT_STATUSES, MACHINE_CONDITIONS } = require('../../../constants/reportEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const sparePartLine = z.object({
  sparePartId: objectId.optional(),
  partCode: z.string().max(40).optional(),
  partName: z.string().max(200).optional(),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().optional(),
});

const create = z.object({
  reportDate: optionalDate,
  customerId: objectId,
  customerMachineId: objectId,
  technicianId: objectId.optional(),

  issueObserved: z.string().max(2000).optional(),
  machineCondition: z.enum(MACHINE_CONDITIONS).optional(),
  recommendation: z.string().max(2000).optional(),
  requiredSpareParts: z.array(sparePartLine).optional().default([]),
  technicianRemarks: z.string().max(2000).optional(),

  customerSignatureUrl: optionalUrl,
  technicianSignatureUrl: optionalUrl,

  status: z.enum(REPORT_STATUSES).optional(),
});

const idParam = z.object({ id: objectId });

module.exports = { create, idParam };
