const TASK_TYPES = Object.freeze([
  'Installation',
  'Service',
  'Preventive Maintenance',
  'Inspection',
  'Incident',
  'Follow-up',
  'Sales',
  'Other',
]);

const TASK_PRIORITIES = Object.freeze(['Low', 'Medium', 'High', 'Urgent']);

const TASK_STATUSES = Object.freeze([
  'Open',
  'Assigned',
  'In Progress',
  'Completed',
  'Closed',
  'Cancelled',
]);

const TASK_TERMINAL_STATUSES = Object.freeze(['Completed', 'Closed', 'Cancelled']);

module.exports = { TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES, TASK_TERMINAL_STATUSES };
