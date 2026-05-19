const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, superAdminOnly } = require('../../middlewares/auth');
const controller = require('./pdf.controller');
const schemas = require('./pdf.validation');

const router = express.Router();

router.use(authenticate);

// Test-only endpoint — restricted to Super Admin so it can't be hammered in prod.
router.post('/test', superAdminOnly, validate({ body: schemas.test }), controller.test);

module.exports = router;
