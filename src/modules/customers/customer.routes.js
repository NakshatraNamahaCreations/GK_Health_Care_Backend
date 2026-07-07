const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const { spreadsheetUpload } = require('../../middlewares/upload');
const controller = require('./customer.controller');
const schemas = require('./customer.validation');

const router = express.Router();

router.use(authenticate);

// Bulk CSV/Excel operations. Registered before "/:id" so "export" and
// "import-template" aren't captured as an id param.
router.get(
  '/export',
  checkPermission('customers', 'read'),
  validate({ query: schemas.listQuery }),
  controller.exportCsv
);

router.get(
  '/import-template',
  checkPermission('customers', 'read'),
  controller.importTemplate
);

router.post(
  '/import',
  checkPermission('customers', 'write'),
  spreadsheetUpload.single('file'),
  controller.importFile
);

router.post(
  '/',
  checkPermission('customers', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('customers', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('customers', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('customers', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  checkPermission('customers', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
