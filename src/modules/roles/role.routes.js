const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./role.controller');
const schemas = require('./role.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('roles', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('roles', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('roles', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('roles', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.patch(
  '/:id/status',
  checkPermission('roles', 'write'),
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  controller.updateStatus
);

module.exports = router;
