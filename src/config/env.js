// Centralized env loader. Import this once at the top of server.js.
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  // We don't throw here so `npm run dev` boots and shows a friendly log,
  // but we surface the issue loudly.
  // eslint-disable-next-line no-console
  console.warn(`[env] Missing required env vars: ${missing.join(', ')}`);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5002,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  mongoUri: process.env.MONGODB_URI,

  corsOrigin: process.env.CORS_ORIGIN || '*',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  s3: {
    region: process.env.S3_REGION || 'ap-south-1',
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT, // optional — for R2 / Spaces / MinIO
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL, // e.g. https://cdn.example.com
    // When using an S3-compatible service that requires path-style addressing.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
};

env.isProd = env.nodeEnv === 'production';
env.isDev = env.nodeEnv === 'development';

module.exports = env;
