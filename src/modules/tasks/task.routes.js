const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, checkPermission } = require('../../middlewares/auth');
const controller = require('./task.controller');
const schemas = require('./task.validation');

const router = express.Router();

router.use(authenticate);

// my-tasks must come BEFORE /:id so Express doesn't treat "my-tasks" as an id.
// Only read permission required — service forces assignedTo = req.user._id.
router.get(
  '/my-tasks',
  checkPermission('tasks', 'read'),
  validate({ query: schemas.myTasksQuery }),
  controller.myTasks
);

router.post(
  '/',
  checkPermission('tasks', 'write'),
  validate({ body: schemas.create }),
  controller.create
);

router.get(
  '/',
  checkPermission('tasks', 'read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.get(
  '/:id',
  checkPermission('tasks', 'read'),
  validate({ params: schemas.idParam }),
  controller.get
);

router.put(
  '/:id',
  checkPermission('tasks', 'write'),
  validate({ params: schemas.idParam, body: schemas.update }),
  controller.update
);

router.patch(
  '/:id/status',
  checkPermission('tasks', 'write'),
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  controller.updateStatus
);

module.exports = router;
