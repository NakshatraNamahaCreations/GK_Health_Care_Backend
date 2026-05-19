const InspectionReport = require('./inspectionReport.model');
const ApiError = require('../../../utils/ApiError');
const { nextReportNumber } = require('../../../utils/reportNumber');
const {
  resolveContext,
  enrichSpareParts,
  generateAndAttachPdf,
} = require('../shared/reportPipeline');

const { auditLegacy: audit } = require('../../../services/auditService');

async function createInspectionReport(payload, actor) {
  const technicianId = payload.technicianId || actor._id;
  const ctx = await resolveContext({
    customerId: payload.customerId,
    customerMachineId: payload.customerMachineId,
    technicianId,
  });

  const requiredSpareParts = await enrichSpareParts(payload.requiredSpareParts);
  const reportNumber = await nextReportNumber('inspection');
  const reportDate = payload.reportDate || new Date();

  const report = await InspectionReport.create({
    ...payload,
    reportNumber,
    reportDate,
    technicianId,
    requiredSpareParts,
    ...ctx.denorm,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  await generateAndAttachPdf({
    report,
    template: 'inspection-report',
    context: ctx,
  });

  // No machine side-effects — inspection observes condition without changing service dates.
  audit('INSPECTION_REPORT_CREATED', report._id, actor._id, null, report.toObject());
  return report;
}

async function getInspectionReport(id) {
  const report = await InspectionReport.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName')
    .populate('customerMachineId', 'machineName serialNumber modelNumber')
    .populate('technicianId', 'name mobileNumber designation');
  if (!report) throw ApiError.notFound('Inspection report not found');
  return report;
}

module.exports = { createInspectionReport, getInspectionReport };
