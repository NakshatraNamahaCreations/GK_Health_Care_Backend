const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./expense.controller');
const schemas = require('./expense.validation');

const router = express.Router();

router.use(authenticate);

// my-expenses BEFORE /:id so Express doesn't treat "my-expenses" as an id.
// Only read permission required — service forces userId = req.user._id.
router.get(
  '/my-expenses',
  checkPermission('expenses', 'read'),
  validate({ query: schemas.myQuery }),
  controller.my
);

router.post(
  '/',
  checkPermission('expenses', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('expenses', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.patch(
  '/:id/approve',
  checkPermission('expenses', 'write'),
  validate({ params: schemas.idParam, body: schemas.approve }),
  controller.approve
);

router.patch(
  '/:id/reject',
  checkPermission('expenses', 'write'),
  validate({ params: schemas.idParam, body: schemas.reject }),
  controller.reject
);

module.exports = router;
