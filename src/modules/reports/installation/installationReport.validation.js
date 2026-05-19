const { z } = require('zod');
const { OBJECT_ID } = require('../../../constants/regex');
const { REPORT_STATUSES } = require('../../../constants/reportEnums');
const { MACHINE_STATUSES } = require('../../../constants/productTypes');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const create = z.object({
  reportDate: z.coerce.date().optional(),
  customerId: objectId,
  customerMachineId: objectId,
  technicianId: objectId.optional(),

  installationDate: z.coerce.date(),
  warrantyStartDate: optionalDate,
  warrantyEndDate: optionalDate,
  amcStartDate: optionalDate,
  amcEndDate: optionalDate,
  machineStatus: z.enum(MACHINE_STATUSES).optional(),
  engineerRemarks: z.string().max(2000).optional(),

  customerSignatureUrl: optionalUrl,
  technicianSignatureUrl: optionalUrl,

  status: z.enum(REPORT_STATUSES).optional(),
});

const idParam = z.object({ id: objectId });

module.exports = { create, idParam };
