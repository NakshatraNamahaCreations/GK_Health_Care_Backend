// Shared regex patterns. Keep them centralized so validations stay consistent
// across Zod schemas and Mongoose `match` validators.

const PHONE_IN = /^[6-9]\d{9}$/;
const PINCODE_IN = /^[1-9][0-9]{5}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Standard 15-char Indian GSTIN.
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const OBJECT_ID = /^[a-f\d]{24}$/i;

module.exports = { PHONE_IN, PINCODE_IN, EMAIL, GSTIN, OBJECT_ID };
