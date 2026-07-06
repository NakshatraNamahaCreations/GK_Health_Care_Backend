const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission, superAdminOnly } = require('../../middlewares/auth');
const controller = require('./company.controller');
const schemas = require('./company.validation');

const router = express.Router();

router.use(authenticate);

// Companies the current user can switch between (drives the company switcher).
router.get('/mine', controller.listMine);

// Full list — super admin management.
router.get('/', superAdminOnly, controller.list);

router.post(
  '/',
  superAdminOnly,
  validate({ body: schemas.create }),
  controller.create
);

router.get('/:id', validate({ params: schemas.idParam }), controller.get);

// Update: super admin, or a user with settings write (edits company profile).
router.put(
  '/:id',
  checkPermission('settings', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  superAdminOnly,
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
