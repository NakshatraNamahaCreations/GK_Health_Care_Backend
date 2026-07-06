const mongoose = require('mongoose');
const { commonReportFields, sparePartUsedSchema } = require('../shared/reportCommon');
const { MACHINE_CONDITIONS } = require('../../../constants/reportEnums');

const inspectionReportSchema = new mongoose.Schema(
  {
    ...commonReportFields,

    // Inspection-specific
    issueObserved: { type: String, trim: true, default: '' },
    machineCondition: { type: String, enum: MACHINE_CONDITIONS, default: 'Good' },
    recommendation: { type: String, trim: true, default: '' },
    // Parts identified as needed during the inspection (not necessarily used).
    requiredSpareParts: { type: [sparePartUsedSchema], default: [] },
    technicianRemarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

inspectionReportSchema.index({ customerId: 1, customerMachineId: 1, reportDate: -1 });

inspectionReportSchema.index({ companyId: 1, reportNumber: 1 }, { unique: true });

const { tenantPlugin } = require('../../../tenant/tenantPlugin');
inspectionReportSchema.plugin(tenantPlugin);

module.exports = mongoose.model('InspectionReport', inspectionReportSchema);
