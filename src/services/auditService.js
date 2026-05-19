// Centralized audit log writer. Drop-in replacement for the no-op `audit()`
// stubs that were scattered through services in earlier sprints.
//
// Usage from a service:
//   const { audit } = require('../../services/auditService');
//   audit(req, 'TASK_CREATED', task._id, { module: 'tasks', oldValue, newValue });
//
// `req` can be omitted (or null) for system events. Writes are best-effort —
// failures are logged but never thrown, so audit never breaks the originating
// business action.

const AuditLog = require('../modules/auditLogs/auditLog.model');
const logger = require('../config/logger');

// Heuristic to extract the action's module from the action string.
// Falls back to the prefix before the first underscore, lowercased.
function inferModule(action) {
  if (!action) return '';
  const prefix = action.split('_')[0];
  // Map a few non-obvious prefixes; everything else uses the lowercased prefix.
  const map = {
    PM: 'preventive_maintenance_reports',
    INSTALLATION: 'installation_reports',
    SERVICE: 'service_reports',
    INSPECTION: 'inspection_reports',
    INCIDENT: 'incident_reports',
    FOLLOWUP: 'leads',
  };
  return (map[prefix] || prefix.toLowerCase()).replace(/^report-?$/, 'reports');
}

// Accepted signatures:
//   audit(req, action, recordId, { module?, oldValue?, newValue?, performedBy? })
//   audit(action, recordId, { module?, oldValue?, newValue?, performedBy? })   (no req)
async function audit(...args) {
  let req = null;
  let action;
  let recordId;
  let opts = {};

  if (args[0] && typeof args[0] === 'object' && args[0].headers) {
    [req, action, recordId, opts = {}] = args;
  } else {
    [action, recordId, opts = {}] = args;
  }
  if (!action) {
    logger.warn('auditService.audit: missing action — skipping');
    return null;
  }

  const performedBy =
    opts.performedBy ||
    (req && req.user && req.user._id) ||
    null;

  const ipAddress =
    (req && (req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress)) || '';
  const userAgent = (req && req.headers && req.headers['user-agent']) || '';

  try {
    return await AuditLog.create({
      action,
      module: opts.module || inferModule(action),
      recordId: recordId || null,
      performedBy,
      oldValue: opts.oldValue ?? null,
      newValue: opts.newValue ?? null,
      ipAddress: String(ipAddress).split(',')[0].trim(),
      userAgent,
    });
  } catch (err) {
    logger.error(`auditService.audit failed (${action}): ${err.message}`);
    return null;
  }
}

// Legacy 5-arg shape used by services created in earlier sprints:
//   audit(action, recordId, performedBy, oldValue, newValue)
// Each module's old `function audit() {}` stub can be replaced with one line:
//   const { auditLegacy: audit } = require('../../services/auditService');
function auditLegacy(action, recordId, performedBy, oldValue, newValue) {
  return audit(action, recordId, { performedBy, oldValue, newValue });
}

module.exports = { audit, auditLegacy };
