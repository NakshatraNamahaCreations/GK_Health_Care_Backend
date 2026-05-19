const IncidentReport = require('./incidentReport.model');
const ApiError = require('../../../utils/ApiError');
const { nextReportNumber } = require('../../../utils/reportNumber');
const {
  resolveContext,
  enrichSpareParts,
  generateAndAttachPdf,
} = require('../shared/reportPipeline');

const { auditLegacy: audit } = require('../../../services/auditService');

async function createIncidentReport(payload, actor) {
  const technicianId = payload.technicianId || actor._id;
  const ctx = await resolveContext({
    customerId: payload.customerId,
    customerMachineId: payload.customerMachineId,
    technicianId,
  });

  const sparePartsUsed = await enrichSpareParts(payload.sparePartsUsed);
  const reportNumber = await nextReportNumber('incident');
  const reportDate = payload.reportDate || new Date();

  const report = await IncidentReport.create({
    ...payload,
    reportNumber,
    reportDate,
    technicianId,
    sparePartsUsed,
    ...ctx.denorm,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  await generateAndAttachPdf({
    report,
    template: 'incident-report',
    context: ctx,
  });

  // No automatic machine side-effects — incidents may or may not change the machine
  // status, and that's captured in the human narrative. Manual update if needed.
  audit('INCIDENT_REPORT_CREATED', report._id, actor._id, null, report.toObject());
  return report;
}

async function getIncidentReport(id) {
  const report = await IncidentReport.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName')
    .populate('customerMachineId', 'machineName serialNumber modelNumber')
    .populate('technicianId', 'name mobileNumber designation');
  if (!report) throw ApiError.notFound('Incident report not found');
  return report;
}

module.exports = { createIncidentReport, getIncidentReport };
