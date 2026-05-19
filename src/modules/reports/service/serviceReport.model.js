const mongoose = require('mongoose');
const { commonReportFields, sparePartUsedSchema } = require('../shared/reportCommon');
const { MACHINE_STATUSES, MACHINE_SERVICE_TYPES } = require('../../../constants/productTypes');

const serviceReportSchema = new mongoose.Schema(
  {
    ...commonReportFields,

    // Service-specific
    serviceType: { type: String, enum: MACHINE_SERVICE_TYPES, default: 'Warranty' },
    complaintReported: { type: String, trim: true, default: '' },
    diagnosis: { type: String, trim: true, default: '' },
    workDone: { type: String, trim: true, default: '' },
    sparePartsUsed: { type: [sparePartUsedSchema], default: [] },
    machineStatusAfterService: { type: String, enum: MACHINE_STATUSES, default: 'Active' },
    nextServiceDate: { type: Date },
    customerRemarks: { type: String, trim: true, default: '' },
    technicianRemarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

serviceReportSchema.index({ customerId: 1, customerMachineId: 1, reportDate: -1 });

module.exports = mongoose.model('ServiceReport', serviceReportSchema);
