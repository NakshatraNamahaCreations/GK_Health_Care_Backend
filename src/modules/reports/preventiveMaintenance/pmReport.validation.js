const { z } = require('zod');
const { OBJECT_ID } = require('../../../constants/regex');
const {
  REPORT_STATUSES,
  MACHINE_CONDITIONS,
  CHECKLIST_STATUSES,
} = require('../../../constants/reportEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const checklistItem = z.object({
  item: z.string().min(1).max(200),
  status: z.enum(CHECKLIST_STATUSES).optional(),
  notes: z.string().max(500).optional(),
});

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

  checklistItems: z.array(checklistItem).optional().default([]),
  machineCondition: z.enum(MACHINE_CONDITIONS).optional(),
  sparePartsUsed: z.array(sparePartLine).optional().default([]),
  nextMaintenanceDate: optionalDate,
  remarks: z.string().max(2000).optional(),

  customerSignatureUrl: optionalUrl,
  technicianSignatureUrl: optionalUrl,

  status: z.enum(REPORT_STATUSES).optional(),
});

const idParam = z.object({ id: objectId });

module.exports = { create, idParam };
