const { z } = require('zod');

const test = z.object({
  template: z.string().min(1).default('sample'),
  // Free-form payload — the chosen template decides which keys it uses.
  data: z.record(z.any()).optional().default({}),
  // The generated PDF is always streamed back — it is never stored.
  filename: z.string().max(120).optional(),
});

module.exports = { test };
