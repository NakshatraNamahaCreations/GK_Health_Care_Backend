const mongoose = require('mongoose');
const { commonReportFields } = require('../shared/reportCommon');
const { MACHINE_STATUSES } = require('../../../constants/productTypes');

const installationReportSchema = new mongoose.Schema(
  {
    ...commonReportFields,

    // Installation-specific
    installationDate: { type: Date, required: true },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
    amcStartDate: { type: Date },
    amcEndDate: { type: Date },
    machineStatus: { type: String, enum: MACHINE_STATUSES, default: 'Installed' },
    engineerRemarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

installationReportSchema.index({ customerId: 1, customerMachineId: 1, reportDate: -1 });

module.exports = mongoose.model('InstallationReport', installationReportSchema);
