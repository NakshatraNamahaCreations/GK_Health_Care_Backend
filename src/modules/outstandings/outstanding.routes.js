const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./outstanding.controller');
const schemas = require('./outstanding.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('outstandings', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('outstandings', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/customer/:customerId',
  checkPermission('outstandings', 'read'),
  validate({ params: schemas.customerIdParam }),
  controller.listByCustomer
);

module.exports = router;
