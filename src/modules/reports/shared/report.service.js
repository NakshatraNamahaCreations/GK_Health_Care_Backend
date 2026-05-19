const InstallationReport = require('../installation/installationReport.model');
const ServiceReport = require('../service/serviceReport.model');
const PmReport = require('../preventiveMaintenance/pmReport.model');
const InspectionReport = require('../inspection/inspectionReport.model');
const IncidentReport = require('../incident/incidentReport.model');
const ApiError = require('../../../utils/ApiError');
const { REPORT_KINDS } = require('../../../constants/reportEnums');

const MODEL_FOR_KIND = {
  [REPORT_KINDS.INSTALLATION]: InstallationReport,
  [REPORT_KINDS.SERVICE]: ServiceReport,
  [REPORT_KINDS.PM]: PmReport,
  [REPORT_KINDS.INSPECTION]: InspectionReport,
  [REPORT_KINDS.INCIDENT]: IncidentReport,
};

function buildFilter(q) {
  const filter = { isDeleted: false };
  if (q.status) filter.status = q.status;
  if (q.customerId) filter.customerId = q.customerId;
  if (q.customerMachineId) filter.customerMachineId = q.customerMachineId;
  if (q.technicianId) filter.technicianId = q.technicianId;
  if (q.fromDate || q.toDate) {
    filter.reportDate = {};
    if (q.fromDate) filter.reportDate.$gte = q.fromDate;
    if (q.toDate) filter.reportDate.$lte = q.toDate;
  }
  if (q.search) {
    const re = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { reportNumber: re },
      { hospitalName: re },
      { machineName: re },
      { serialNumber: re },
      { technicianName: re },
    ];
  }
  return filter;
}

async function listReports(q) {
  const Model = MODEL_FOR_KIND[q.type];
  if (!Model) throw ApiError.badRequest('Invalid report type');

  const filter = buildFilter(q);
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Model.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName')
      .populate('customerMachineId', 'machineName serialNumber modelNumber')
      .populate('technicianId', 'name mobileNumber')
      .sort({ reportDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    Model.countDocuments(filter),
  ]);

  return {
    items: items.map((doc) => ({ ...doc.toObject(), type: q.type })),
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 },
  };
}

// Tries all three report collections in turn. Returns { kind, report } or null.
async function findReportAcrossKinds(id) {
  for (const [kind, Model] of Object.entries(MODEL_FOR_KIND)) {
    // eslint-disable-next-line no-await-in-loop
    const report = await Model.findOne({ _id: id, isDeleted: false })
      .populate('customerId', 'customerCode customerName hospitalName')
      .populate('customerMachineId', 'machineName serialNumber modelNumber')
      .populate('technicianId', 'name mobileNumber designation');
    if (report) return { kind, report };
  }
  return null;
}

module.exports = { listReports, findReportAcrossKinds, MODEL_FOR_KIND };
