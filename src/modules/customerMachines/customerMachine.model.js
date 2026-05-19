const mongoose = require('mongoose');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');
const { MACHINE_STATUSES, MACHINE_SERVICE_TYPES } = require('../../constants/productTypes');

const customerMachineSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },

    machineName: { type: String, required: true, trim: true },
    modelNumber: { type: String, trim: true, default: '' },
    manufacturer: { type: String, trim: true, default: '' },
    // Index defined below as a partial-unique on non-empty strings.
    serialNumber: { type: String, trim: true },

    soldDate: { type: Date },
    installationDate: { type: Date },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
    amcStartDate: { type: Date },
    amcEndDate: { type: Date },

    machineStatus: { type: String, enum: MACHINE_STATUSES, default: 'Installed', index: true },
    serviceType: { type: String, enum: MACHINE_SERVICE_TYPES, default: 'Warranty' },

    lastServiceDate: { type: Date },
    nextServiceDueDate: { type: Date, index: true },

    remarks: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ROLE_STATUS_VALUES,
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Serial number should be unique when present.
customerMachineSchema.index(
  { serialNumber: 1 },
  { unique: true, partialFilterExpression: { serialNumber: { $type: 'string', $ne: '' } } }
);

module.exports = mongoose.model('CustomerMachine', customerMachineSchema);
