const mongoose = require('mongoose');
const { FOLLOWUP_OUTCOMES, FOLLOWUP_CHANNELS } = require('../../constants/leadEnums');

const leadFollowUpSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    followUpDate: { type: Date, required: true },
    channel: { type: String, enum: FOLLOWUP_CHANNELS, default: 'Call' },
    contactedPerson: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    outcome: { type: String, enum: FOLLOWUP_OUTCOMES, default: 'Other' },
    nextFollowUpDate: { type: Date },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

leadFollowUpSchema.index({ leadId: 1, followUpDate: -1 });

const { tenantPlugin } = require('../../tenant/tenantPlugin');
leadFollowUpSchema.plugin(tenantPlugin);

module.exports = mongoose.model('LeadFollowUp', leadFollowUpSchema);
