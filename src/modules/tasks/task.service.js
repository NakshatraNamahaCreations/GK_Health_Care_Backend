const Task = require('./task.model');
const Customer = require('../customers/customer.model');
const Lead = require('../leads/lead.model');
const CustomerMachine = require('../customerMachines/customerMachine.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { TASK_TERMINAL_STATUSES } = require('../../constants/taskEnums');
const notificationService = require('../../services/notificationService');

const { auditLegacy: audit } = require('../../services/auditService');

async function assertRefs(payload) {
  if (payload.customerId) {
    const ok = await Customer.findOne({ _id: payload.customerId, isDeleted: false });
    if (!ok) throw ApiError.badRequest('Invalid customerId');
  }
  if (payload.leadId) {
    const ok = await Lead.findOne({ _id: payload.leadId, isDeleted: false });
    if (!ok) throw ApiError.badRequest('Invalid leadId');
  }
  if (payload.customerMachineId) {
    const ok = await CustomerMachine.findOne({ _id: payload.customerMachineId, isDeleted: false });
    if (!ok) throw ApiError.badRequest('Invalid customerMachineId');
  }
  if (payload.assignedTo) {
    const ok = await User.findById(payload.assignedTo);
    if (!ok) throw ApiError.badRequest('Invalid assignedTo user');
  }
}

async function createTask(payload, actor) {
  await assertRefs(payload);

  const taskNumber = await nextCode('task', 'TASK', 5);

  // Auto-bump status to "Assigned" when an assignee is provided at create time and
  // the caller didn't explicitly set a status. Saves a follow-up status PATCH.
  const taskStatus =
    payload.taskStatus ||
    (payload.assignedTo ? 'Assigned' : 'Open');

  const task = await Task.create({
    ...payload,
    taskNumber,
    taskStatus,
    assignedBy: payload.assignedTo ? actor._id : undefined,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  if (task.assignedTo) {
    // Best-effort — failure here doesn't roll back the task.
    notificationService.taskAssigned({
      task,
      assigneeId: task.assignedTo,
      assignedByUser: actor,
    });
  }

  audit('TASK_CREATED', task._id, actor._id, null, task.toObject());
  return task;
}

function buildListFilter(q) {
  const filter = { isDeleted: false };
  for (const k of [
    'taskStatus',
    'taskType',
    'priority',
    'assignedTo',
    'assignedBy',
    'customerId',
    'leadId',
    'customerMachineId',
  ]) {
    if (q[k]) filter[k] = q[k];
  }

  if (q.dueFrom || q.dueTo) {
    filter.dueDate = {};
    if (q.dueFrom) filter.dueDate.$gte = q.dueFrom;
    if (q.dueTo) filter.dueDate.$lte = q.dueTo;
  }

  if (q.overdue) {
    filter.dueDate = { ...(filter.dueDate || {}), $lt: new Date() };
    filter.taskStatus = filter.taskStatus || { $nin: TASK_TERMINAL_STATUSES };
  }

  if (q.search) {
    const re = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ taskNumber: re }, { taskTitle: re }, { description: re }];
  }
  return filter;
}

async function listTasks(q) {
  const filter = buildListFilter(q);
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'name mobileNumber email')
      .populate('assignedBy', 'name mobileNumber')
      .populate('customerId', 'customerCode customerName hospitalName')
      .populate('leadId', 'leadName hospitalName status')
      .populate('customerMachineId', 'machineName serialNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    Task.countDocuments(filter),
  ]);
  return { items, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 } };
}

async function listMyTasks(q, userId) {
  // Force the assignedTo filter to the caller — users can only see their own tasks.
  const filter = buildListFilter(q);
  filter.assignedTo = userId;

  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Task.find(filter)
      .populate('customerId', 'customerCode customerName hospitalName')
      .populate('leadId', 'leadName hospitalName status')
      .populate('customerMachineId', 'machineName serialNumber')
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    Task.countDocuments(filter),
  ]);
  return { items, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 } };
}

async function getTask(id) {
  const task = await Task.findOne({ _id: id, isDeleted: false })
    .populate('assignedTo', 'name mobileNumber email')
    .populate('assignedBy', 'name mobileNumber')
    .populate('customerId', 'customerCode customerName hospitalName')
    .populate('leadId', 'leadName hospitalName status')
    .populate('customerMachineId', 'machineName serialNumber');
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

async function updateTask(id, payload, actor) {
  const task = await Task.findOne({ _id: id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task not found');

  await assertRefs(payload);

  const oldAssignee = task.assignedTo ? task.assignedTo.toString() : null;
  const oldValue = task.toObject();

  Object.assign(task, payload, { updatedBy: actor._id });

  // If the assignee changed, record assignedBy and notify the new assignee.
  const newAssignee = task.assignedTo ? task.assignedTo.toString() : null;
  const assigneeChanged = newAssignee && newAssignee !== oldAssignee;
  if (assigneeChanged) {
    task.assignedBy = actor._id;
    if (task.taskStatus === 'Open') task.taskStatus = 'Assigned';
  }

  await task.save();

  if (assigneeChanged) {
    notificationService.taskAssigned({
      task,
      assigneeId: task.assignedTo,
      assignedByUser: actor,
    });
  }

  audit('TASK_UPDATED', task._id, actor._id, oldValue, task.toObject());
  return task;
}

async function setStatus(id, { taskStatus, remarks, completionDate }, actor) {
  const task = await Task.findOne({ _id: id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task not found');

  const oldStatus = task.taskStatus;
  task.taskStatus = taskStatus;
  if (typeof remarks === 'string') task.remarks = remarks;

  // Auto-stamp completionDate when transitioning to Completed/Closed unless caller supplied one.
  if (['Completed', 'Closed'].includes(taskStatus)) {
    task.completionDate = completionDate || task.completionDate || new Date();
  }
  if (taskStatus === 'Cancelled' && !task.completionDate) {
    task.completionDate = completionDate || new Date();
  }

  task.updatedBy = actor._id;
  await task.save();

  // Notify the assignee (if any, and not the actor) that status changed.
  if (task.assignedTo && task.assignedTo.toString() !== actor._id.toString()) {
    notificationService.taskStatusChanged({
      task,
      recipientId: task.assignedTo,
      oldStatus,
      newStatus: taskStatus,
      actorId: actor._id,
    });
  }

  audit('TASK_STATUS_CHANGED', task._id, actor._id, { taskStatus: oldStatus }, { taskStatus });
  return task;
}

module.exports = {
  createTask,
  listTasks,
  listMyTasks,
  getTask,
  updateTask,
  setStatus,
};
