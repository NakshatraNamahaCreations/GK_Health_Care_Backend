const mongoose = require('mongoose');
const { tenantPlugin } = require('../../tenant/tenantPlugin');

// Modules a terms template can attach to. One default per module is used when
// printing that document type.
const TERMS_MODULES = [
  'quotation',
  'order',
  'purchase-order',
  'delivery-note',
  'installation-report',
  'service-report',
  'preventive-maintenance-report',
  'inspection-report',
  'incident-report',
];

const termsTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    module: { type: String, enum: TERMS_MODULES, required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    // The default template is the one appended to printouts for its module.
    isDefault: { type: Boolean, default: false, index: true },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

termsTemplateSchema.plugin(tenantPlugin);

const TermsTemplate = mongoose.model('TermsTemplate', termsTemplateSchema);
TermsTemplate.TERMS_MODULES = TERMS_MODULES;

module.exports = TermsTemplate;
