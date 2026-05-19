const REPORT_STATUSES = Object.freeze([
  'Draft',
  'Submitted',
  'Approved',
  'Cancelled',
]);

const REPORT_TERMINAL_STATUSES = Object.freeze(['Approved', 'Cancelled']);

const MACHINE_CONDITIONS = Object.freeze(['Good', 'Average', 'Poor']);

const CHECKLIST_STATUSES = Object.freeze(['OK', 'Issue', 'NA']);

const REPORT_KINDS = Object.freeze({
  INSTALLATION: 'installation',
  SERVICE: 'service',
  PM: 'preventive-maintenance',
  INSPECTION: 'inspection',
  INCIDENT: 'incident',
});

// Maps the URL/query "type" value → permission moduleKey for RBAC.
const REPORT_KIND_TO_MODULE_KEY = Object.freeze({
  installation: 'installation_reports',
  service: 'service_reports',
  'preventive-maintenance': 'preventive_maintenance_reports',
  inspection: 'inspection_reports',
  incident: 'incident_reports',
});

module.exports = {
  REPORT_STATUSES,
  REPORT_TERMINAL_STATUSES,
  MACHINE_CONDITIONS,
  CHECKLIST_STATUSES,
  REPORT_KINDS,
  REPORT_KIND_TO_MODULE_KEY,
};
