// S3 / S3-compatible storage service (AWS, Cloudflare R2, DigitalOcean Spaces, MinIO).
// Uploads return a { key, fileUrl, mimeType, size, originalName } shape that the
// upload module passes back to clients.

const { randomUUID } = require('crypto');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

let _client = null;

function isConfigured() {
  return Boolean(env.s3.bucket && env.s3.accessKeyId && env.s3.secretAccessKey);
}

function getClient() {
  if (!isConfigured()) {
    throw ApiError.internal('S3 is not configured (missing S3_BUCKET / credentials)');
  }
  if (_client) return _client;
  _client = new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint || undefined,
    forcePathStyle: env.s3.forcePathStyle,
    credentials: {
      accessKeyId: env.s3.accessKeyId,
      secretAccessKey: env.s3.secretAccessKey,
    },
  });
  return _client;
}

// Build a deterministic, collision-free key like:
//   "signatures/2026/05/9f1c…-customer-sign.png"
function buildKey({ moduleKey, originalName }) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeName = (originalName || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
  return `${moduleKey}/${yyyy}/${mm}/${randomUUID()}-${safeName}`;
}

function buildPublicUrl(key) {
  // If a CDN / public base is configured, use that.
  if (env.s3.publicBaseUrl) {
    return `${env.s3.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }
  // Else fall back to a standard S3 URL.
  if (env.s3.endpoint) {
    // Custom endpoint (R2/Spaces/MinIO): {endpoint}/{bucket}/{key} for path-style,
    // or {bucket}.{endpoint}/{key} otherwise.
    const ep = env.s3.endpoint.replace(/\/+$/, '');
    if (env.s3.forcePathStyle) return `${ep}/${env.s3.bucket}/${key}`;
    // virtual-hosted style — drop scheme://host
    const m = ep.match(/^(https?:\/\/)(.+)$/);
    return m ? `${m[1]}${env.s3.bucket}.${m[2]}/${key}` : `${ep}/${env.s3.bucket}/${key}`;
  }
  return `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${key}`;
}

async function putObject({ buffer, mimeType, moduleKey, originalName, acl = 'public-read' }) {
  if (!buffer || !buffer.length) throw ApiError.badRequest('Empty file buffer');
  const key = buildKey({ moduleKey, originalName });

  const client = getClient();
  const cmd = new PutObjectCommand({
    Bucket: env.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: acl,
  });
  await client.send(cmd);

  return {
    key,
    fileUrl: buildPublicUrl(key),
    mimeType,
    size: buffer.length,
    originalName,
  };
}

async function deleteObject(key) {
  const client = getClient();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
    return true;
  } catch (err) {
    logger.error(`s3 delete failed for ${key}: ${err.message}`);
    return false;
  }
}

module.exports = { isConfigured, putObject, deleteObject, buildPublicUrl, buildKey };

// Suppress unused-import warning for `path` in older linters — keep available for callers.
void path;
