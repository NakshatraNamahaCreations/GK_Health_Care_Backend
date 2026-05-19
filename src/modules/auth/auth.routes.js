const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { loginLimiter, passwordLimiter } = require('../../middlewares/rateLimit');
const controller = require('./auth.controller');
const schemas = require('./auth.validation');

const router = express.Router();

router.post('/login', loginLimiter, validate({ body: schemas.login }), controller.login);
router.get('/me', authenticate, controller.me);
router.patch(
  '/change-password',
  passwordLimiter,
  authenticate,
  validate({ body: schemas.changePassword }),
  controller.changePassword
);

module.exports = router;
