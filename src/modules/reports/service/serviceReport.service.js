const ServiceReport = require('./serviceReport.model');
const Order = require('../../orders/order.model');
const ApiError = require('../../../utils/ApiError');
const { nextReportNumber } = require('../../../utils/reportNumber');
const {
  resolveContext,
  enrichSpareParts,
  generateAndAttachPdf,
  updateMachineFromReport,
} = require('../shared/reportPipeline');

const { auditLegacy: audit } = require('../../../services/auditService');

async function createServiceReport(payload, actor) {
  const technicianId = payload.technicianId || actor._id;
  const ctx = await resolveContext({
    customerId: payload.customerId,
    customerMachineId: payload.customerMachineId,
    technicianId,
  });

  const sparePartsUsed = await enrichSpareParts(payload.sparePartsUsed);
  const reportNumber = await nextReportNumber('service');

  const reportDate = payload.reportDate || new Date();

  const report = await ServiceReport.create({
    ...payload,
    reportNumber,
    reportDate,
    technicianId,
    sparePartsUsed,
    ...ctx.denorm,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  // Link the source order back to this report.
  if (payload.orderId) {
    await Order.updateOne(
      { _id: payload.orderId, isDeleted: false },
      { $set: { serviceReportId: report._id, updatedBy: actor._id } }
    );
  }

  await generateAndAttachPdf({
    report,
    template: 'service-report',
    context: ctx,
  });

  // Side-effects on the machine: last/next service dates + post-service status.
  await updateMachineFromReport(
    payload.customerMachineId,
    {
      lastServiceDate: reportDate,
      nextServiceDueDate: payload.nextServiceDate,
      machineStatus: payload.machineStatusAfterService || ctx.machine.machineStatus,
    },
    actor._id
  );

  audit('SERVICE_REPORT_CREATED', report._id, actor._id, null, report.toObject());
  return report;
}

async function getServiceReport(id) {
  const report = await ServiceReport.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName')
    .populate('customerMachineId', 'machineName serialNumber modelNumber')
    .populate('technicianId', 'name mobileNumber designation');
  if (!report) throw ApiError.notFound('Service report not found');
  return report;
}

module.exports = { createServiceReport, getServiceReport };
