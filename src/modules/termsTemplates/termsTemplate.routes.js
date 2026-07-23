const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./termsTemplate.controller');
const schemas = require('./termsTemplate.validation');

const router = express.Router();

router.use(authenticate);

// Reading is open to any signed-in user — templates are appended to printouts
// from many modules (quotations, orders, reports). Writes need settings access.
router.get('/', validate({ query: schemas.listQuery }), controller.list);

router.post(
  '/',
  checkPermission('settings', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.put(
  '/:id',
  checkPermission('settings', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  checkPermission('settings', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
