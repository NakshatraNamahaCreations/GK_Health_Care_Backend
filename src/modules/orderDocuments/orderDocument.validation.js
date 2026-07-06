const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const OrderDocument = require('./orderDocument.model');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const optionalDate = z.coerce.date().optional();

const item = z.object({
  name: z.string().trim().min(1).max(200),
  hsnCode: z.string().max(20).optional(),
  quantity: z.coerce.number().nonnegative().default(1),
  rate: z.coerce.number().nonnegative().optional().default(0),
  amount: z.coerce.number().nonnegative().optional(),
});

const create = z.object({
  orderId: objectId,
  docType: z.enum(OrderDocument.ORDER_DOC_TYPES),
  docDate: optionalDate,
  vendorName: z.string().max(200).optional(),
  expectedDeliveryDate: optionalDate,
  vehicleNumber: z.string().max(60).optional(),
  receivedBy: z.string().max(120).optional(),
  items: z.array(item).optional(),
  notes: z.string().max(4000).optional(),
  status: z.enum(OrderDocument.ORDER_DOC_STATUSES).optional(),
});

const update = z.object({
  docDate: optionalDate,
  vendorName: z.string().max(200).optional(),
  expectedDeliveryDate: optionalDate,
  vehicleNumber: z.string().max(60).optional(),
  receivedBy: z.string().max(120).optional(),
  items: z.array(item).optional(),
  notes: z.string().max(4000).optional(),
  status: z.enum(OrderDocument.ORDER_DOC_STATUSES).optional(),
});

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  orderId: objectId.optional(),
  docType: z.enum(OrderDocument.ORDER_DOC_TYPES).optional(),
});

module.exports = { create, update, idParam, listQuery };
