const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');
const { PRODUCT_TYPES } = require('../../constants/productTypes');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const statusEnum = z.enum(ROLE_STATUS_VALUES);
const productTypeEnum = z.enum(PRODUCT_TYPES);

const create = z.object({
  productName: z.string().min(2).max(200),
  productType: productTypeEnum,
  category: z.string().max(100).optional(),
  manufacturer: z.string().max(150).optional(),
  modelNumber: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().nonnegative().optional(),
  gstPercentage: z.coerce.number().min(0).max(100).optional(),
  hsnCode: z.string().max(20).optional(),
  warrantyMonths: z.coerce.number().int().min(0).optional(),
  status: statusEnum.optional(),
});

const update = create.partial();

const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
  productType: productTypeEnum.optional(),
  category: z.string().trim().optional(),
});

module.exports = { create, update, idParam, listQuery };
