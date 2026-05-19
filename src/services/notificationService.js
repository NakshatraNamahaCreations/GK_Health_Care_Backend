// Notification creation helpers. Centralized so every state-change call site
// can persist a record without duplicating field shapes.
// Sprint 10 adds FCM push delivery — keep the function signatures stable.
const Notification = require('../modules/notifications/notification.model');
const logger = require('../config/logger');

async function create({
  userId,
  type,
  title,
  message = '',
  entityType = '',
  entityId,
  data = {},
  triggeredBy,
}) {
  if (!userId || !type || !title) {
    // Don't throw — notifications are best-effort, not critical-path.
    logger.warn('notificationService.create: missing userId/type/title — skipping');
    return null;
  }
  try {
    return await Notification.create({
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
      data,
      triggeredBy,
    });
  } catch (err) {
    logger.error(`notificationService.create failed: ${err.message}`);
    return null; // never break the originating business action
  }
}

async function taskAssigned({ task, assigneeId, assignedByUser }) {
  // Lead with "Assigned by X", then the description (if any), on a second line.
  const byLine = assignedByUser ? `Assigned by ${assignedByUser.name}` : '';
  const desc = task.description || '';
  const message = [byLine, desc].filter(Boolean).join('\n');

  return create({
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: `New task assigned: ${task.taskTitle}`,
    message,
    entityType: 'Task',
    entityId: task._id,
    data: {
      taskNumber: task.taskNumber,
      taskType: task.taskType,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedByName: assignedByUser?.name,
    },
    triggeredBy: assignedByUser?._id,
  });
}

async function leadAssigned({ lead, assigneeId, assignedByUser }) {
  return create({
    userId: assigneeId,
    type: 'LEAD_ASSIGNED',
    title: `New lead assigned: ${lead.leadName}`,
    message: assignedByUser ? `Assigned by ${assignedByUser.name}` : '',
    entityType: 'Lead',
    entityId: lead._id,
    data: {
      leadName: lead.leadName,
      hospitalName: lead.hospitalName,
      contactPersonName: lead.contactPersonName,
      phone: lead.phone,
      leadType: lead.leadType,
      followUpDate: lead.followUpDate,
    },
    triggeredBy: assignedByUser?._id,
  });
}

async function taskStatusChanged({ task, recipientId, oldStatus, newStatus, actorId }) {
  return create({
    userId: recipientId,
    type: 'TASK_STATUS_CHANGED',
    title: `Task ${task.taskNumber} → ${newStatus}`,
    message: `Status changed from ${oldStatus} to ${newStatus}`,
    entityType: 'Task',
    entityId: task._id,
    data: { taskNumber: task.taskNumber, oldStatus, newStatus },
    triggeredBy: actorId,
  });
}

module.exports = { create, taskAssigned, taskStatusChanged, leadAssigned };
