const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./orderDocument.controller');
const schemas = require('./orderDocument.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('orders', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

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

router.put(
  '/:id',
  checkPermission('orders', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

module.exports = router;
