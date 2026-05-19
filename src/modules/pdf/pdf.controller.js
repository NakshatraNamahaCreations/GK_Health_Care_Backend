const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const pdfService = require('../../services/pdfService');
const s3 = require('../../services/s3Service');

// Default payload merged with whatever the caller passes — keeps the test endpoint
// useful even with an empty body.
function buildDefaultData() {
  return {
    title: 'GK Health Care — Sample Document',
    documentType: 'Quotation',
    documentNumber: 'TEST-0001',
    documentDate: new Date(),
    generatedAt: new Date(),
    company: {
      name: 'GK Health Care',
      address: 'No 1, Main Road, Bengaluru, Karnataka 560001',
    },
    customer: {
      name: 'Mr. Ramesh',
      phone: '9876543210',
      hospitalName: 'Sri Lakshmi Dialysis Center',
      gstin: '29ABCDE1234F1Z5',
      address: 'No 25, Main Road, Rajajinagar, Bengaluru',
    },
    items: [
      { name: 'Dialysis Machine DM-500', quantity: 1, rate: 450000, total: 450000 },
      { name: 'Blood Tubing Set', quantity: 10, rate: 250, total: 2500 },
    ],
    totals: { subTotal: 452500, gst: 54300, grandTotal: 506800 },
    remarks: 'This is a sample PDF generated from the test endpoint.',
  };
}

exports.test = asyncHandler(async (req, res) => {
  const { template, data, upload, filename } = req.body;

  const payload = { ...buildDefaultData(), ...(data || {}) };
  const pdfBuffer = await pdfService.renderToPdf(template, payload);

  const outputName = (filename || `pdf-test-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '-') + '.pdf';

  if (upload && s3.isConfigured()) {
    const result = await s3.putObject({
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      moduleKey: 'reports',
      originalName: outputName,
    });
    return ApiResponse.ok(res, result, 'Sample PDF generated and uploaded');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${outputName}"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.status(200).end(pdfBuffer);
});
