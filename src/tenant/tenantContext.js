const { AsyncLocalStorage } = require('async_hooks');

// Holds the active companyId (and a bypass flag) for the duration of a request.
// AsyncLocalStorage propagates the value across await boundaries, so every DB
// call made while handling a request can read the active company without it
// being threaded through every function signature.
const storage = new AsyncLocalStorage();

// Wrap a request (or any async unit of work) in a fresh tenant store.
function runWithStore(fn) {
  return storage.run({ companyId: null, bypass: false }, fn);
}

function getStore() {
  return storage.getStore() || null;
}

function getCompanyId() {
  const store = storage.getStore();
  return store ? store.companyId : null;
}

function setCompanyId(companyId) {
  const store = storage.getStore();
  if (store) store.companyId = companyId;
}

// True when tenant scoping should be skipped (e.g. super-admin cross-company
// tooling or migrations). Reads/writes are unfiltered while bypass is on.
function isBypassed() {
  const store = storage.getStore();
  return store ? Boolean(store.bypass) : false;
}

// Run `fn` with tenant scoping temporarily disabled.
function runUnscoped(fn) {
  return storage.run({ companyId: null, bypass: true }, fn);
}

module.exports = {
  storage,
  runWithStore,
  getStore,
  getCompanyId,
  setCompanyId,
  isBypassed,
  runUnscoped,
};
