// Cloudinary storage service. Uploads return a
//   { key, fileUrl, mimeType, size, originalName, resourceType }
// shape that the upload/PDF/report modules pass back to clients.
//
// Images (signatures, logos) are stored as `image` resources; everything else
// (generated PDFs) is stored as `raw` so the exact file is served back as-is.

const { randomUUID } = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

let _configured = false;

function isConfigured() {
  return Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
  );
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw ApiError.internal(
      'Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)'
    );
  }
  if (_configured) return;
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  _configured = true;
}

function resourceTypeFor(mimeType) {
  return String(mimeType || '').startsWith('image/') ? 'image' : 'raw';
}

// Build a deterministic, collision-free public_id like:
//   "signatures/2026/05/9f1c…-customer-sign"
// Image public_ids carry no extension (Cloudinary appends the format); raw
// public_ids keep the extension so the delivered file is e.g. `…/REPORT.pdf`.
function buildKey({ moduleKey, originalName, resourceType }) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ext = path.extname(originalName || '');
  const base = path.basename(originalName || 'file', ext);
  const safeName =
    base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120) || 'file';
  const id = `${moduleKey}/${yyyy}/${mm}/${randomUUID()}-${safeName}`;
  return resourceType === 'raw' && ext ? `${id}${ext}` : id;
}

async function putObject({ buffer, mimeType, moduleKey, originalName }) {
  if (!buffer || !buffer.length) throw ApiError.badRequest('Empty file buffer');
  ensureConfigured();

  const resourceType = resourceTypeFor(mimeType);
  const publicId = buildKey({ moduleKey, originalName, resourceType });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: resourceType, overwrite: false },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    Readable.from(buffer).pipe(stream);
  });

  return {
    key: result.public_id,
    fileUrl: result.secure_url,
    mimeType,
    size: result.bytes || buffer.length,
    originalName,
    resourceType,
  };
}

async function deleteObject(key, resourceType = 'image') {
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(key, { resource_type: resourceType });
    return true;
  } catch (err) {
    logger.error(`cloudinary delete failed for ${key}: ${err.message}`);
    return false;
  }
}

// Recover { publicId, resourceType } from a Cloudinary delivery URL like
//   https://res.cloudinary.com/<cloud>/image/upload/v123/signatures/2026/07/uuid-name.png
// Returns null for non-Cloudinary URLs.
function parseCloudinaryUrl(url) {
  try {
    const u = new URL(String(url));
    if (!/(^|\.)cloudinary\.com$/.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const rtIdx = parts.findIndex((p) => ['image', 'video', 'raw'].includes(p));
    if (rtIdx === -1 || !parts[rtIdx + 1]) return null;
    const resourceType = parts[rtIdx];
    // Skip resource_type + delivery type (upload/authenticated) + optional version.
    let rest = parts.slice(rtIdx + 2);
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (!rest.length) return null;
    let publicId = rest.join('/');
    // Image/video public_ids carry no extension; raw keeps it.
    if (resourceType !== 'raw') publicId = publicId.replace(/\.[^/.]+$/, '');
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

// Delete an asset given its public delivery URL. Best-effort — returns false
// when the URL isn't a Cloudinary asset or the destroy call fails.
async function deleteByUrl(url) {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) return false;
  return deleteObject(parsed.publicId, parsed.resourceType);
}

function buildPublicUrl(key) {
  ensureConfigured();
  return cloudinary.url(key, { secure: true });
}

module.exports = {
  isConfigured,
  putObject,
  deleteObject,
  deleteByUrl,
  buildPublicUrl,
  buildKey,
};
