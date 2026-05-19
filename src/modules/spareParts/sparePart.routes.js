const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const { excelUpload } = require('../../middlewares/upload');
const controller = require('./sparePart.controller');
const schemas = require('./sparePart.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/import-excel',
  checkPermission('spare_parts', 'write'),
  excelUpload.single('file'),
  controller.importExcel
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
