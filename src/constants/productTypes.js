const PRODUCT_TYPES = Object.freeze([
  'Dialysis Machine',
  'Accessory',
  'Service Item',
  'Other',
]);

const MACHINE_STATUSES = Object.freeze([
  'Installed',
  'Active',
  'Under Maintenance',
  'Decommissioned',
  'Returned',
]);

const MACHINE_SERVICE_TYPES = Object.freeze([
  'Warranty',
  'AMC',
  'Out of Warranty',
  'CMC',
  'Rental',
]);

module.exports = { PRODUCT_TYPES, MACHINE_STATUSES, MACHINE_SERVICE_TYPES };
