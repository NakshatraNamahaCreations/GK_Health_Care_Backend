const mongoose = require('mongoose');
const { commonReportFields, sparePartUsedSchema } = require('../shared/reportCommon');

const incidentReportSchema = new mongoose.Schema(
  {
    ...commonReportFields,

    // Incident-specific
    incidentDate: { type: Date, required: true },
    issueDescription: { type: String, trim: true, default: '' },
    rootCause: { type: String, trim: true, default: '' },
    actionTaken: { type: String, trim: true, default: '' },
    sparePartsUsed: { type: [sparePartUsedSchema], default: [] },
    pendingAction: { type: String, trim: true, default: '' },
    technicianRemarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

incidentReportSchema.index({ customerId: 1, customerMachineId: 1, reportDate: -1 });
incidentReportSchema.index({ incidentDate: -1 });

module.exports = mongoose.model('IncidentReport', incidentReportSchema);
