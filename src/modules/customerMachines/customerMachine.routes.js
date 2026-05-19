const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./customerMachine.controller');
const schemas = require('./customerMachine.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('customer_machines', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('customer_machines', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/customer/:customerId',
  checkPermission('customer_machines', 'read'),
  validate({ params: schemas.customerIdParam }),
  controller.listByCustomer
);

router.get(
  '/:id',
  checkPermission('customer_machines', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('customer_machines', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  checkPermission('customer_machines', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
