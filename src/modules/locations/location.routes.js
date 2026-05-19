const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./location.controller');
const schemas = require('./location.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/states',
  checkPermission('locations', 'read'),
  validate({ query: schemas.listStateQuery }),
  controller.listStates
);

router.post(
  '/states',
  checkPermission('locations', 'write'),
  validate({ body: schemas.createState }),
  controller.createState
);

router.get(
  '/cities',
  checkPermission('locations', 'read'),
  validate({ query: schemas.listCityQuery }),
  controller.listCities
);

router.post(
  '/cities',
  checkPermission('locations', 'write'),
  validate({ body: schemas.createCity }),
  controller.createCity
);

module.exports = router;
