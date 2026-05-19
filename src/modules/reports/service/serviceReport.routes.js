const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate, checkPermission } = require('../../../middlewares/auth');
const controller = require('./serviceReport.controller');
const schemas = require('./serviceReport.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('service_reports', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

module.exports = router;
