const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./quotation.controller');
const schemas = require('./quotation.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('quotations', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('quotations', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('quotations', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('quotations', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.patch(
  '/:id/status',
  checkPermission('quotations', 'write'),
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  controller.updateStatus
);

router.delete(
  '/:id',
  checkPermission('quotations', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
