const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const controller = require('./notification.controller');
const schemas = require('./notification.validation');

const router = express.Router();

router.use(authenticate);

// All notification routes are scoped to the authenticated user — no extra RBAC.

router.get('/', validate({ query: schemas.listQuery }), controller.list);
router.patch('/read-all', controller.markAllRead);
router.post('/save-fcm-token', validate({ body: schemas.saveFcmToken }), controller.saveFcmToken);
router.patch('/:id/read', validate({ params: schemas.idParam }), controller.markRead);

module.exports = router;
