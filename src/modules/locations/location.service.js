const State = require('./state.model');
const City = require('./city.model');
const ApiError = require('../../utils/ApiError');

async function listStates({ search, status }) {
  const filter = {};
  if (search) filter.name = new RegExp(escape(search), 'i');
  if (status) filter.status = status;
  return State.find(filter).sort({ name: 1 });
}

async function createState(payload, actorId) {
  const dupe = await State.findOne({ name: payload.name });
  if (dupe) throw ApiError.conflict('State already exists');
  return State.create({ ...payload, createdBy: actorId, updatedBy: actorId });
}

async function listCities({ stateId, search, status }) {
  const filter = {};
  if (stateId) filter.stateId = stateId;
  if (search) filter.name = new RegExp(escape(search), 'i');
  if (status) filter.status = status;
  return City.find(filter).sort({ name: 1 });
}

async function createCity(payload, actorId) {
  const state = await State.findById(payload.stateId);
  if (!state) throw ApiError.badRequest('Invalid stateId');

  const dupe = await City.findOne({ stateId: state._id, name: payload.name });
  if (dupe) throw ApiError.conflict('City already exists for this state');

  return City.create({
    name: payload.name,
    stateId: state._id,
    stateName: state.name,
    status: payload.status,
    createdBy: actorId,
    updatedBy: actorId,
  });
}

// Tiny helper: escape user-supplied regex input.
function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { listStates, createState, listCities, createCity };
