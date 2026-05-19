const PAYMENT_MODES = Object.freeze([
  'Cash',
  'Cheque',
  'NEFT',
  'RTGS',
  'IMPS',
  'UPI',
  'Card',
  'Other',
]);

const OUTSTANDING_STATUSES = Object.freeze([
  'Open',           // no payment received yet
  'Partially Paid', // some payment received but balance > 0
  'Paid',           // fully paid
  'Overdue',        // past dueDate with balance > 0 (derived but persisted)
]);

const EXPENSE_STATUSES = Object.freeze(['Pending', 'Approved', 'Rejected']);

module.exports = { PAYMENT_MODES, OUTSTANDING_STATUSES, EXPENSE_STATUSES };
