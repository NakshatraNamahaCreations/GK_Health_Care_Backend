const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./expenseCategory.controller');
const schemas = require('./expenseCategory.validation');

const router = express.Router();

router.use(authenticate);

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

module.exports = router;
