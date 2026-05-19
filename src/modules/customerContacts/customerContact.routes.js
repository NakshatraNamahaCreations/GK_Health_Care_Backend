const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./customerContact.controller');
const schemas = require('./customerContact.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('customer_contacts', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/customer/:customerId',
  checkPermission('customer_contacts', 'read'),
  validate({ params: schemas.customerIdParam }),
  controller.listByCustomer
);

router.put(
  '/:id',
  checkPermission('customer_contacts', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  checkPermission('customer_contacts', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
