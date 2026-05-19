// Per-IP rate limiters. Applied selectively to the most-abused endpoints —
// global request limits aren't useful for an internal CRM.
const rateLimit = require('express-rate-limit');

// Login: 10 attempts per IP per 15 min. Successful logins don't count.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Try again later.',
    errors: [],
  },
});

// Password mutation routes: 5 per IP per hour.
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password change attempts.',
    errors: [],
  },
});

module.exports = { loginLimiter, passwordLimiter };
