const mongoose = require('mongoose');

// Records important state-changing actions across the system.
// Written by services via auditService — never directly.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. "TASK_STATUS_CHANGED"
    module: { type: String, index: true },                  // e.g. "tasks", "customers"
    recordId: { type: mongoose.Schema.Types.ObjectId, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    oldValue: { type: Object, default: null },
    newValue: { type: Object, default: null },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
