const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate, checkPermission } = require('../../../middlewares/auth');
const controller = require('./installationReport.controller');
const schemas = require('./installationReport.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('installation_reports', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

module.exports = router;
