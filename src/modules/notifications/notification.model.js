const mongoose = require('mongoose');

// Minimal notification record. Sprint 10 adds the full Notification module
// (mark-as-read APIs, FCM push integration) on top of this same schema.
const notificationSchema = new mongoose.Schema(
  {
    // Recipient.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // What kind of event triggered this notification (e.g. TASK_ASSIGNED, TASK_STATUS_CHANGED).
    type: { type: String, required: true, index: true },

    title: { type: String, required: true },
    message: { type: String, default: '' },

    // Loose reference to the originating record. `entityType` + `entityId` keeps it polymorphic
    // without requiring `refPath`, which we don't need until Sprint 10.
    entityType: { type: String, default: '' }, // e.g. "Task", "Lead", "ServiceReport"
    entityId: { type: mongoose.Schema.Types.ObjectId },

    // Free-form payload — e.g. {"taskNumber":"TASK-00012","dueDate":"..."}.
    data: { type: Object, default: {} },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },

    // Who/what produced this notification (system or another user).
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const { tenantPlugin } = require('../../tenant/tenantPlugin');
notificationSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Notification', notificationSchema);
