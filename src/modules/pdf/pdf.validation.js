const { z } = require('zod');

const test = z.object({
  template: z.string().min(1).default('sample'),
  // Free-form payload — the chosen template decides which keys it uses.
  data: z.record(z.any()).optional().default({}),
  // Default behaviour: stream the PDF back. `upload=true` pushes it to S3 and returns the URL.
  upload: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : !!v)),
  filename: z.string().max(120).optional(),
});

module.exports = { test };
