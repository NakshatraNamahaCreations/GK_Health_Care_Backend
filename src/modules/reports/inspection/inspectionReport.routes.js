const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate, checkPermission } = require('../../../middlewares/auth');
const controller = require('./inspectionReport.controller');
const schemas = require('./inspectionReport.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('inspection_reports', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

module.exports = router;
