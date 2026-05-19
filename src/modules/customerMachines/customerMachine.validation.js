const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');
const { MACHINE_STATUSES, MACHINE_SERVICE_TYPES } = require('../../constants/productTypes');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const statusEnum = z.enum(ROLE_STATUS_VALUES);
const machineStatusEnum = z.enum(MACHINE_STATUSES);
const serviceTypeEnum = z.enum(MACHINE_SERVICE_TYPES);

// Accepts ISO strings or Date objects (Excel parser gives Date).
const dateField = z.coerce.date().optional();

const create = z.object({
  customerId: objectId,
  productId: objectId.optional(),
  machineName: z.string().min(2).max(200),
  modelNumber: z.string().max(100).optional(),
  manufacturer: z.string().max(150).optional(),
  serialNumber: z.string().max(120).optional(),
  soldDate: dateField,
  installationDate: dateField,
  warrantyStartDate: dateField,
  warrantyEndDate: dateField,
  amcStartDate: dateField,
  amcEndDate: dateField,
  machineStatus: machineStatusEnum.optional(),
  serviceType: serviceTypeEnum.optional(),
  lastServiceDate: dateField,
  nextServiceDueDate: dateField,
  remarks: z.string().max(2000).optional(),
  status: statusEnum.optional(),
});

const update = create.partial();
const idParam = z.object({ id: objectId });
const customerIdParam = z.object({ customerId: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  customerId: objectId.optional(),
  productId: objectId.optional(),
  machineStatus: machineStatusEnum.optional(),
  serviceType: serviceTypeEnum.optional(),
  status: statusEnum.optional(),
  dueBefore: dateField,
});

module.exports = { create, update, idParam, customerIdParam, listQuery };
