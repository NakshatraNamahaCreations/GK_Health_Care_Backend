const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./payment.controller');
const schemas = require('./payment.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('payments', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('payments', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/customer/:customerId',
  checkPermission('payments', 'read'),
  validate({ params: schemas.customerIdParam }),
  controller.listByCustomer
);

module.exports = router;
