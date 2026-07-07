const InstallationReport = require('./installationReport.model');
const Order = require('../../orders/order.model');
const ApiError = require('../../../utils/ApiError');
const { nextReportNumber } = require('../../../utils/reportNumber');
const {
  resolveContext,
  updateMachineFromReport,
} = require('../shared/reportPipeline');

const { auditLegacy: audit } = require('../../../services/auditService');

async function createInstallationReport(payload, actor) {
  const technicianId = payload.technicianId || actor._id;
  const ctx = await resolveContext({
    customerId: payload.customerId,
    customerMachineId: payload.customerMachineId,
    technicianId,
  });

  const reportNumber = await nextReportNumber('installation');

  const report = await InstallationReport.create({
    ...payload,
    reportNumber,
    technicianId,
    ...ctx.denorm,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  // Link the source order back to this report.
  if (payload.orderId) {
    await Order.updateOne(
      { _id: payload.orderId, isDeleted: false },
      { $set: { installationReportId: report._id, updatedBy: actor._id } }
    );
  }

  // Side-effects on the machine: stamp installation dates, warranty, AMC, machine status.
  await updateMachineFromReport(
    payload.customerMachineId,
    {
      installationDate: payload.installationDate,
      warrantyStartDate: payload.warrantyStartDate,
      warrantyEndDate: payload.warrantyEndDate,
      amcStartDate: payload.amcStartDate,
      amcEndDate: payload.amcEndDate,
      machineStatus: payload.machineStatus || 'Installed',
    },
    actor._id
  );

  audit('INSTALLATION_REPORT_CREATED', report._id, actor._id, null, report.toObject());
  return report;
}

async function getInstallationReport(id) {
  const report = await InstallationReport.findOne({ _id: id, isDeleted: false })
    .populate('customerId', 'customerCode customerName hospitalName')
    .populate('customerMachineId', 'machineName serialNumber modelNumber')
    .populate('technicianId', 'name mobileNumber designation');
  if (!report) throw ApiError.notFound('Installation report not found');
  return report;
}

module.exports = { createInstallationReport, getInstallationReport };
