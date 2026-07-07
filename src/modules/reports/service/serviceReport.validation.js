const { z } = require('zod');
const { OBJECT_ID } = require('../../../constants/regex');
const { REPORT_STATUSES } = require('../../../constants/reportEnums');
const { MACHINE_STATUSES, MACHINE_SERVICE_TYPES } = require('../../../constants/productTypes');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));
// Signatures are mandatory on service reports.
const requiredCustomerSignature = z.string().url('Customer signature is required');
const requiredTechnicianSignature = z.string().url('Technician signature is required');

const sparePartLine = z.object({
  sparePartId: objectId.optional(),
  partCode: z.string().max(40).optional(),
  partName: z.string().max(200).optional(),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().optional(),
});

const create = z.object({
  reportDate: optionalDate,
  orderId: objectId.optional(),
  customerId: objectId,
  customerMachineId: objectId,
  technicianId: objectId.optional(),

  serviceType: z.enum(MACHINE_SERVICE_TYPES).optional(),
  complaintReported: z.string().max(2000).optional(),
  diagnosis: z.string().max(2000).optional(),
  workDone: z.string().max(2000).optional(),
  sparePartsUsed: z.array(sparePartLine).optional().default([]),
  machineStatusAfterService: z.enum(MACHINE_STATUSES).optional(),
  nextServiceDate: optionalDate,
  customerRemarks: z.string().max(2000).optional(),
  technicianRemarks: z.string().max(2000).optional(),

  customerSignatureUrl: requiredCustomerSignature,
  technicianSignatureUrl: requiredTechnicianSignature,

  status: z.enum(REPORT_STATUSES).optional(),
});

const idParam = z.object({ id: objectId });

module.exports = { create, idParam };
