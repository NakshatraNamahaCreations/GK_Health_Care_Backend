// Runs all dashboard counts/sums in parallel for snappy responses.
// Each call uses the canonical "non-deleted" filter to stay consistent with list endpoints.

const Customer = require('../customers/customer.model');
const Lead = require('../leads/lead.model');
const Task = require('../tasks/task.model');
const Quotation = require('../quotations/quotation.model');
const Payment = require('../payments/payment.model');
const Outstanding = require('../outstandings/outstanding.model');
const Expense = require('../expenses/expense.model');
const InstallationReport = require('../reports/installation/installationReport.model');
const ServiceReport = require('../reports/service/serviceReport.model');
const PmReport = require('../reports/preventiveMaintenance/pmReport.model');
const InspectionReport = require('../reports/inspection/inspectionReport.model');
const IncidentReport = require('../reports/incident/incidentReport.model');

const REPORT_MODELS = [
  InstallationReport,
  ServiceReport,
  PmReport,
  InspectionReport,
  IncidentReport,
];

const NOT_DELETED = { isDeleted: false };
const PENDING_TASK_STATUSES = ['Open', 'Assigned', 'In Progress'];
const COMPLETED_TASK_STATUSES = ['Completed', 'Closed'];

async function sumField(Model, field, match) {
  const r = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return r[0]?.total || 0;
}

async function summary() {
  // Reports are spread across 5 collections — count each, sum.
  const reportCounts = REPORT_MODELS.map((M) => M.countDocuments(NOT_DELETED));

  const [
    totalCustomers,
    totalLeads,
    totalTasks,
    pendingTasks,
    completedTasks,
    totalQuotations,
    totalPayments,
    totalOutstanding,
    totalExpenses,
    reportsArr,
  ] = await Promise.all([
    Customer.countDocuments(NOT_DELETED),
    Lead.countDocuments(NOT_DELETED),
    Task.countDocuments(NOT_DELETED),
    Task.countDocuments({ ...NOT_DELETED, taskStatus: { $in: PENDING_TASK_STATUSES } }),
    Task.countDocuments({ ...NOT_DELETED, taskStatus: { $in: COMPLETED_TASK_STATUSES } }),
    Quotation.countDocuments(NOT_DELETED),
    sumField(Payment, 'amount', NOT_DELETED),
    sumField(Outstanding, 'balanceAmount', { ...NOT_DELETED, status: { $ne: 'Paid' } }),
    sumField(Expense, 'amount', { ...NOT_DELETED, status: 'Approved' }),
    Promise.all(reportCounts),
  ]);

  const totalReports = reportsArr.reduce((a, b) => a + b, 0);

  return {
    totalCustomers,
    totalLeads,
    totalTasks,
    pendingTasks,
    completedTasks,
    totalReports,
    totalQuotations,
    totalPayments,        // sum of payment amounts
    totalOutstanding,     // sum of unpaid balances
    totalExpenses,        // sum of approved expense amounts
    reportBreakdown: {
      installation: reportsArr[0],
      service: reportsArr[1],
      preventiveMaintenance: reportsArr[2],
      inspection: reportsArr[3],
      incident: reportsArr[4],
    },
  };
}

async function mySummary(userId) {
  const reportFilters = { ...NOT_DELETED, technicianId: userId };
  const reportCounts = REPORT_MODELS.map((M) => M.countDocuments(reportFilters));

  const [
    assignedTasks,
    pendingTasks,
    completedTasks,
    leads,
    reportsArr,
    myExpensesTotal,
    myExpensesPending,
  ] = await Promise.all([
    Task.countDocuments({ ...NOT_DELETED, assignedTo: userId }),
    Task.countDocuments({
      ...NOT_DELETED,
      assignedTo: userId,
      taskStatus: { $in: PENDING_TASK_STATUSES },
    }),
    Task.countDocuments({
      ...NOT_DELETED,
      assignedTo: userId,
      taskStatus: { $in: COMPLETED_TASK_STATUSES },
    }),
    Lead.countDocuments({ ...NOT_DELETED, assignedTo: userId }),
    Promise.all(reportCounts),
    sumField(Expense, 'amount', { ...NOT_DELETED, userId }),
    Expense.countDocuments({ ...NOT_DELETED, userId, status: 'Pending' }),
  ]);

  const totalReports = reportsArr.reduce((a, b) => a + b, 0);

  return {
    tasks: {
      assigned: assignedTasks,
      pending: pendingTasks,
      completed: completedTasks,
    },
    leads,
    reports: {
      total: totalReports,
      installation: reportsArr[0],
      service: reportsArr[1],
      preventiveMaintenance: reportsArr[2],
      inspection: reportsArr[3],
      incident: reportsArr[4],
    },
    expenses: {
      totalAmount: myExpensesTotal,
      pendingCount: myExpensesPending,
    },
  };
}

module.exports = { summary, mySummary };
