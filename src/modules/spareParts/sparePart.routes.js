const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const { spreadsheetUpload } = require('../../middlewares/upload');
const controller = require('./sparePart.controller');
const schemas = require('./sparePart.validation');

const router = express.Router();

router.use(authenticate);

// GET the ready-to-fill CSV template. Registered before "/:id".
router.get(
  '/import-template',
  checkPermission('spare_parts', 'read'),
  controller.importTemplate
);

// Accepts CSV or Excel. Path kept as "/import-excel" for backward compatibility.
router.post(
  '/import-excel',
  checkPermission('spare_parts', 'write'),
  spreadsheetUpload.single('file'),
  controller.importFile
);

router.post(
  '/',
  checkPermission('spare_parts', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('spare_parts', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('spare_parts', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('spare_parts', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  checkPermission('spare_parts', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
