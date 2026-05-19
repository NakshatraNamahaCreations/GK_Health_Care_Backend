const express = require('express');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./dashboard.controller');

const router = express.Router();

router.use(authenticate);

// Org-wide summary is gated by dashboard read permission. my-summary is
// always available to the authenticated user (it only shows their own data).
router.get('/summary', checkPermission('dashboard', 'read'), controller.summary);
router.get('/my-summary', controller.mySummary);

module.exports = router;
