const mongoose = require('mongoose');
const { commonReportFields, sparePartUsedSchema } = require('../shared/reportCommon');
const { MACHINE_CONDITIONS, CHECKLIST_STATUSES } = require('../../../constants/reportEnums');

const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    status: { type: String, enum: CHECKLIST_STATUSES, default: 'OK' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const pmReportSchema = new mongoose.Schema(
  {
    ...commonReportFields,

    // PM-specific
    checklistItems: { type: [checklistItemSchema], default: [] },
    machineCondition: { type: String, enum: MACHINE_CONDITIONS, default: 'Good' },
    sparePartsUsed: { type: [sparePartUsedSchema], default: [] },
    nextMaintenanceDate: { type: Date },
    remarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

pmReportSchema.index({ customerId: 1, customerMachineId: 1, reportDate: -1 });

module.exports = mongoose.model('PreventiveMaintenanceReport', pmReportSchema);
