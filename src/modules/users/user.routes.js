const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./user.controller');
const schemas = require('./user.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('users', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('users', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('users', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('users', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.patch(
  '/:id/status',
  checkPermission('users', 'write'),
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  controller.updateStatus
);

router.patch(
  '/:id/reset-password',
  checkPermission('users', 'write'),
  validate({ params: schemas.idParam, body: schemas.resetPassword }),
  controller.resetPassword
);

module.exports = router;
