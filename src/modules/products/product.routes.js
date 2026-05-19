const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const { excelUpload } = require('../../middlewares/upload');
const controller = require('./product.controller');
const schemas = require('./product.validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/import-excel',
  checkPermission('products', 'write'),
  excelUpload.single('file'),
  controller.importExcel
);

router.post(
  '/',
  checkPermission('products', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('products', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('products', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('products', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.delete(
  '/:id',
  checkPermission('products', 'write'),
  validate({ params: schemas.idParam }),
  controller.remove
);

module.exports = router;
