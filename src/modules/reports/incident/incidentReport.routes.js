const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate, checkPermission } = require('../../../middlewares/auth');
const controller = require('./incidentReport.controller');
const schemas = require('./incidentReport.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('incident_reports', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

module.exports = router;
