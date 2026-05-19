const express = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate } = require('../../../middlewares/auth');
const ApiError = require('../../../utils/ApiError');
const controller = require('./report.controller');
const schemas = require('./report.validation');
const { REPORT_KIND_TO_MODULE_KEY } = require('../../../constants/reportEnums');

const router = express.Router();

router.use(authenticate);

// Dynamic checkPermission for the listing endpoint — `type` decides which
// module's read permission is required.
function checkReadForReportType(req, res, next) {
  try {
    const moduleKey = REPORT_KIND_TO_MODULE_KEY[req.query.type];
    if (!moduleKey) return next(ApiError.badRequest('Invalid type'));
    if (req.role.isSuperAdmin) return next();
    if (!req.role.hasPermission(moduleKey, 'read')) {
      return next(ApiError.forbidden(`Missing read permission for ${moduleKey}`));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

router.get('/', validate({ query: schemas.listQuery }), checkReadForReportType, controller.list);
router.get('/:id', validate({ params: schemas.idParam }), controller.get);

module.exports = router;
