const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} = require('../../constants/taskEnums');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();

const create = z.object({
  taskTitle: z.string().min(2).max(200),
  taskType: z.enum(TASK_TYPES),
  customerId: objectId.optional(),
  leadId: objectId.optional(),
  customerMachineId: objectId.optional(),
  assignedTo: objectId.optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: optionalDate,
  taskStatus: z.enum(TASK_STATUSES).optional(),
  description: z.string().max(2000).optional(),
  remarks: z.string().max(2000).optional(),
  relatedReportId: objectId.optional(),
});

const update = create.partial();

const updateStatus = z.object({
  taskStatus: z.enum(TASK_STATUSES),
  remarks: z.string().max(2000).optional(),
  completionDate: optionalDate,
});

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  taskStatus: z.enum(TASK_STATUSES).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedTo: objectId.optional(),
  assignedBy: objectId.optional(),
  customerId: objectId.optional(),
  leadId: objectId.optional(),
  customerMachineId: objectId.optional(),
  dueFrom: optionalDate,
  dueTo: optionalDate,
  overdue: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
});

const myTasksQuery = listQuery.omit({ assignedTo: true, assignedBy: true });

module.exports = { create, update, updateStatus, idParam, listQuery, myTasksQuery };
