const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./order.controller');
const schemas = require('./order.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  checkPermission('orders', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('orders', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.patch(
  '/:id/status',
  checkPermission('orders', 'write'),
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  controller.updateStatus
);

module.exports = router;
