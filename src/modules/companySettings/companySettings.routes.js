const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./companySettings.controller');
const schemas = require('./companySettings.validation');

const router = express.Router();

router.use(authenticate);

// Readable by any authenticated user — the header details appear on printed
// quotations, so anyone who can print one needs to read them.
router.get('/', controller.get);

// Only users with settings write can change the company profile.
router.put(
  '/',
  checkPermission('settings', 'write'),
  validate({ body: schemas.update }),
  controller.update
);

module.exports = router;
