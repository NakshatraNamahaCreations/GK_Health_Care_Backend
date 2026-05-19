const mongoose = require('mongoose');
const {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} = require('../../constants/taskEnums');

const taskSchema = new mongoose.Schema(
  {
    taskNumber: { type: String, required: true, unique: true, index: true },
    taskTitle: { type: String, required: true, trim: true },
    taskType: { type: String, enum: TASK_TYPES, required: true, index: true },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    customerMachineId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerMachine', index: true },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    priority: { type: String, enum: TASK_PRIORITIES, default: 'Medium', index: true },
    dueDate: { type: Date, index: true },

    taskStatus: { type: String, enum: TASK_STATUSES, default: 'Open', index: true },

    description: { type: String, trim: true, default: '' },
    remarks: { type: String, trim: true, default: '' },

    completionDate: { type: Date },

    // Loose reference — multiple report collections exist (installation/service/PM/inspection/incident).
    // No `ref` here so we don't need refPath until Sprint 7.
    relatedReportId: { type: mongoose.Schema.Types.ObjectId },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taskSchema.index({ taskNumber: 'text', taskTitle: 'text', description: 'text' });

module.exports = mongoose.model('Task', taskSchema);
