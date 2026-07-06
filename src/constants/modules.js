// Canonical permissionable modules. Mirrors RBAC_AND_SECURITY.md.
// Permissions are stored per role as: { moduleKey, moduleName, read, write }.
// Add a new entry here whenever a new feature module is introduced.

const APP_MODULES = Object.freeze([
  { moduleKey: 'dashboard', moduleName: 'Dashboard' },
  { moduleKey: 'customers', moduleName: 'Customers / Hospitals' },
  { moduleKey: 'customer_contacts', moduleName: 'Customer Contacts' },
  { moduleKey: 'customer_machines', moduleName: 'Customer Machines' },
  { moduleKey: 'leads', moduleName: 'Leads' },
  { moduleKey: 'tasks', moduleName: 'Tasks' },
  { moduleKey: 'products', moduleName: 'Products' },
  { moduleKey: 'spare_parts', moduleName: 'Spare Parts' },
  { moduleKey: 'installation_reports', moduleName: 'Installation Reports' },
  { moduleKey: 'service_reports', moduleName: 'Service Reports' },
  { moduleKey: 'preventive_maintenance_reports', moduleName: 'Preventive Maintenance Reports' },
  { moduleKey: 'inspection_reports', moduleName: 'Inspection Reports' },
  { moduleKey: 'incident_reports', moduleName: 'Incident Reports' },
  { moduleKey: 'quotations', moduleName: 'Quotations' },
  { moduleKey: 'orders', moduleName: 'Orders' },
  { moduleKey: 'payments', moduleName: 'Payments' },
  { moduleKey: 'outstandings', moduleName: 'Outstanding' },
  { moduleKey: 'expenses', moduleName: 'Expenses' },
  { moduleKey: 'notifications', moduleName: 'Notifications' },
  { moduleKey: 'users', moduleName: 'Users' },
  { moduleKey: 'roles', moduleName: 'Roles and Permissions' },
  { moduleKey: 'locations', moduleName: 'Locations' },
  { moduleKey: 'settings', moduleName: 'Settings' },
]);

const MODULE_KEYS = APP_MODULES.map((m) => m.moduleKey);
const MODULE_NAME_BY_KEY = APP_MODULES.reduce((acc, m) => {
  acc[m.moduleKey] = m.moduleName;
  return acc;
}, {});

const ACTIONS = Object.freeze({ READ: 'read', WRITE: 'write' });

module.exports = { APP_MODULES, MODULE_KEYS, MODULE_NAME_BY_KEY, ACTIONS };
