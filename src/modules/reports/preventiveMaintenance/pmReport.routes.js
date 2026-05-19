const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate, checkPermission } = require('../../../middlewares/auth');
const controller = require('./pmReport.controller');
const schemas = require('./pmReport.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('preventive_maintenance_reports', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

module.exports = router;
