const { z } = require('zod');
const { OBJECT_ID } = require('../../constants/regex');
const { ROLE_STATUS_VALUES } = require('../../constants/status');

const objectId = z.string().regex(OBJECT_ID, 'Invalid id');
const statusEnum = z.enum(ROLE_STATUS_VALUES);

const createState = z.object({
  name: z.string().min(2).max(80),
  code: z.string().trim().max(10).optional(),
  country: z.string().trim().max(80).optional(),
  status: statusEnum.optional(),
});

const createCity = z.object({
  name: z.string().min(2).max(100),
  stateId: objectId,
  status: statusEnum.optional(),
});

const listStateQuery = z.object({
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
});

const listCityQuery = z.object({
  stateId: objectId.optional(),
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
});

module.exports = { createState, createCity, listStateQuery, listCityQuery };
