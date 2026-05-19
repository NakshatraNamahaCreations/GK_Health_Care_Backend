const LEAD_STATUSES = Object.freeze([
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
  'Converted',
  'Dropped',
]);

const LEAD_TYPES = Object.freeze(['Hot', 'Warm', 'Cold']);

// Terminal states — lead can no longer be reopened/edited heavily.
const LEAD_TERMINAL_STATUSES = Object.freeze(['Converted', 'Won', 'Lost', 'Dropped']);

const FOLLOWUP_OUTCOMES = Object.freeze([
  'Interested',
  'Not Interested',
  'Call Back',
  'No Response',
  'Wrong Number',
  'Other',
]);

const FOLLOWUP_CHANNELS = Object.freeze(['Call', 'Visit', 'Email', 'WhatsApp', 'SMS', 'Other']);

module.exports = {
  LEAD_STATUSES,
  LEAD_TYPES,
  LEAD_TERMINAL_STATUSES,
  FOLLOWUP_OUTCOMES,
  FOLLOWUP_CHANNELS,
};
