const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { mountSwagger } = require('./config/swagger');
const { runWithStore } = require('./tenant/tenantContext');

const app = express();

// Trust proxy when deployed behind Nginx / ALB so req.ip + rate-limit work correctly.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — supports comma-separated list or "*"
const corsOrigin = env.corsOrigin === '*'
  ? '*'
  : env.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL injection defence — strips $ and . keys from req.body / query / params.
app.use(mongoSanitize());

// HTTP parameter pollution — collapses duplicate query params to the last value.
app.use(hpp());

// Gzip compression
app.use(compression());

// Establish a per-request tenant store so the active company propagates to all
// DB calls. `authenticate` fills in the companyId once the user is known.
app.use((req, res, next) => runWithStore(() => next()));

// Request logging
app.use(
  morgan(env.isProd ? 'combined' : 'dev', {
    stream: logger.stream,
  })
);

// API routes
app.use(env.apiPrefix, routes);

// API docs (Swagger UI + raw JSON spec at /api-docs.json)
mountSwagger(app, '/api-docs');

// Root ping (useful for load balancers that don't read JSON)
app.get('/', (req, res) => {
  res.status(200).send('GK Health Care Backend is running');
});

// 404 + global error handler — must be last
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
