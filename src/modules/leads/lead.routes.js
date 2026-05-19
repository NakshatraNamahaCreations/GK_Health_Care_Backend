const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./lead.controller');
const schemas = require('./lead.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  checkPermission('leads', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('leads', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('leads', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('leads', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.patch(
  '/:id/status',
  checkPermission('leads', 'write'),
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  controller.updateStatus
);

router.delete(
  '/:id',
  checkPermission('leads', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

// Follow-ups
router.post(
  '/:id/followups',
  checkPermission('leads', 'write'),
  validate({ params: schemas.idParam, body: schemas.createFollowUp }),
  controller.addFollowUp
);

router.get(
  '/:id/followups',
  checkPermission('leads', 'read'),
  validate({ params: schemas.idParam }),
  controller.listFollowUps
);

// Convert to customer — requires write on BOTH leads and customers.
router.post(
  '/:id/convert-to-customer',
  checkPermission('leads', 'write'),
  checkPermission('customers', 'write'),
  validate({ params: schemas.idParam, body: schemas.convertToCustomer }),
  controller.convertToCustomer
);

module.exports = router;
