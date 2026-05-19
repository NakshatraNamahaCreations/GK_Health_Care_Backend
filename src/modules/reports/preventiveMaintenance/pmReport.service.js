const PmReport = require('./pmReport.model');
const ApiError = require('../../../utils/ApiError');
const { nextReportNumber } = require('../../../utils/reportNumber');
const {
  resolveContext,
  enrichSpareParts,
  generateAndAttachPdf,
  updateMachineFromReport,
} = require('../shared/reportPipeline');

const { auditLegacy: audit } = require('../../../services/auditService');

async function createPmReport(payload, actor) {
  const technicianId = payload.technicianId || actor._id;
  const ctx = await resolveContext({
    customerId: payload.customerId,
    customerMachineId: payload.customerMachineId,
    technicianId,
  });

  const sparePartsUsed = await enrichSpareParts(payload.sparePartsUsed);
  const reportNumber = await nextReportNumber('preventiveMaintenance');
  const reportDate = payload.reportDate || new Date();

  const report = await PmReport.create({
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
    template: 'pm-report',
    context: ctx,
  });

  // Side-effects on the machine: last/next service dates.
  await updateMachineFromReport(
    payload.customerMachineId,
    {
      lastServiceDate: reportDate,
      nextServiceDueDate: payload.nextMaintenanceDate,
    },
    actor._id
  );

  audit('PM_REPORT_CREATED', report._id, actor._id, null, report.toObject());
  return report;
}

async function getPmReport(id) {
  const report = await PmReport.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName')
    .populate('customerMachineId', 'machineName serialNumber modelNumber')
    .populate('technicianId', 'name mobileNumber designation');
  if (!report) throw ApiError.notFound('Preventive maintenance report not found');
  return report;
}

module.exports = { createPmReport, getPmReport };
