// Pipeline shared by every report-creation flow:
//   1. resolve customer + machine + technician → denormalize names onto the report
//   2. enrich sparePartsUsed lines with code/name/rate from the master record
//   3. persist the report
//   4. generate PDF, upload to S3, save pdfUrl (best effort)
//   5. update CustomerMachine `lastServiceDate` / `nextServiceDueDate` / etc.

const ApiError = require('../../../utils/ApiError');
const logger = require('../../../config/logger');
const Customer = require('../../customers/customer.model');
const CustomerMachine = require('../../customerMachines/customerMachine.model');
const SparePart = require('../../spareParts/sparePart.model');
const User = require('../../users/user.model');
const pdfService = require('../../../services/pdfService');
const s3 = require('../../../services/s3Service');

async function resolveContext({ customerId, customerMachineId, technicianId }) {
  const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
  if (!customer) throw ApiError.badRequest('Invalid customerId');

  const machine = await CustomerMachine.findOne({
    _id: customerMachineId,
    isDeleted: false,
  });
  if (!machine) throw ApiError.badRequest('Invalid customerMachineId');
  if (machine.customerId.toString() !== customer._id.toString()) {
    throw ApiError.badRequest('customerMachineId does not belong to this customer');
  }

  const technician = await User.findById(technicianId);
  if (!technician) throw ApiError.badRequest('Invalid technicianId');

  return {
    customer,
    machine,
    technician,
    denorm: {
      hospitalName: customer.hospitalName,
      machineName: machine.machineName,
      serialNumber: machine.serialNumber || '',
      technicianName: technician.name,
    },
  };
}

async function enrichSpareParts(lines = []) {
  if (!Array.isArray(lines) || !lines.length) return [];
  const ids = lines.map((l) => l.sparePartId).filter(Boolean);
  const parts = ids.length
    ? await SparePart.find({ _id: { $in: ids }, isDeleted: false })
    : [];
  const byId = new Map(parts.map((p) => [p._id.toString(), p]));

  return lines.map((line) => {
    const master = line.sparePartId ? byId.get(line.sparePartId.toString()) : null;
    return {
      sparePartId: line.sparePartId,
      partCode: line.partCode || master?.partCode || '',
      partName: line.partName || master?.partName || '',
      quantity: line.quantity,
      rate: line.rate ?? master?.rate ?? 0,
    };
  });
}

// Build a Handlebars-friendly view model from a saved report doc.
function buildPdfPayload({ report, customer, machine, technician }) {
  return {
    company: {
      name: 'GK Health Care',
      address: 'No 1, Main Road, Bengaluru, Karnataka 560001',
    },
    report: report.toObject({ virtuals: false }),
    customer: customer.toObject({ virtuals: false }),
    machine: machine.toObject({ virtuals: false }),
    technician: {
      _id: technician._id,
      name: technician.name,
      mobileNumber: technician.mobileNumber,
      designation: technician.designation,
    },
    generatedAt: new Date(),
  };
}

// Generates the PDF, pushes it to S3, sets report.pdfUrl. Best-effort:
// failures are logged but never block the report creation.
async function generateAndAttachPdf({ report, template, context }) {
  if (!s3.isConfigured()) {
    logger.warn(`PDF skipped — S3 not configured. Report ${report.reportNumber}`);
    return null;
  }
  try {
    const payload = buildPdfPayload({
      report,
      customer: context.customer,
      machine: context.machine,
      technician: context.technician,
    });
    const buffer = await pdfService.renderToPdf(template, payload);
    const out = await s3.putObject({
      buffer,
      mimeType: 'application/pdf',
      moduleKey: 'reports',
      originalName: `${report.reportNumber}.pdf`,
    });
    report.pdfUrl = out.fileUrl;
    await report.save();
    return out;
  } catch (err) {
    logger.error(`PDF generation failed for ${report.reportNumber}: ${err.message}`);
    return null;
  }
}

// Applies post-report side-effects to the related CustomerMachine.
// Each report kind passes its own set of fields to update.
async function updateMachineFromReport(machineId, updates, actorId) {
  if (!updates || !Object.keys(updates).length) return;
  await CustomerMachine.findByIdAndUpdate(machineId, { ...updates, updatedBy: actorId });
}

module.exports = {
  resolveContext,
  enrichSpareParts,
  generateAndAttachPdf,
  updateMachineFromReport,
};
