const QUOTATION_STATUSES = Object.freeze([
  'Draft',
  'Sent',
  'Accepted',
  'Rejected',
  'Converted',
]);

const QUOTATION_TERMINAL_STATUSES = Object.freeze(['Accepted', 'Rejected', 'Converted']);

const QUOTATION_ITEM_TYPES = Object.freeze(['Product', 'Spare Part', 'Service']);

module.exports = {
  QUOTATION_STATUSES,
  QUOTATION_TERMINAL_STATUSES,
  QUOTATION_ITEM_TYPES,
};
