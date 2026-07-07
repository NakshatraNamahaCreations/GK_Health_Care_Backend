const { z } = require('zod');

const update = z.object({
  name: z.string().max(200).optional(),
  tagline: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(100).optional(),
  email: z.string().max(150).optional(),
  gstin: z.string().max(30).optional(),
  stateName: z.string().max(100).optional(),
  stateCode: z.string().max(10).optional(),
  logoUrl: z.string().max(1000).optional(),
  bankName: z.string().max(150).optional(),
  accountNumber: z.string().max(50).optional(),
  branch: z.string().max(150).optional(),
  ifsc: z.string().max(20).optional(),
});

module.exports = { update };
