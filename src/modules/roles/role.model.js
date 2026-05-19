const mongoose = require('mongoose');
const { MODULE_KEYS, MODULE_NAME_BY_KEY } = require('../../constants/modules');
const { ROLE_STATUS, ROLE_STATUS_VALUES } = require('../../constants/status');

const permissionSchema = new mongoose.Schema(
  {
    moduleKey: { type: String, required: true, enum: MODULE_KEYS },
    moduleName: { type: String, required: true },
    read: { type: Boolean, default: false },
    write: { type: Boolean, default: false },
  },
  { _id: false }
);

// Enforce: write implies read.
permissionSchema.pre('validate', function (next) {
  if (this.write && !this.read) {
    return next(new Error(`Permission for "${this.moduleKey}": write requires read.`));
  }
  // Auto-fill moduleName from the canonical catalog if not provided / mismatched.
  if (this.moduleKey && MODULE_NAME_BY_KEY[this.moduleKey]) {
    this.moduleName = MODULE_NAME_BY_KEY[this.moduleKey];
  }
  next();
});

const roleSchema = new mongoose.Schema(
  {
    roleName: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, trim: true, default: '' },
    isSuperAdmin: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ROLE_STATUS_VALUES,
      default: ROLE_STATUS.ACTIVE,
      index: true,
    },
    permissions: { type: [permissionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roleSchema.virtual('isActive').get(function () {
  return this.status === ROLE_STATUS.ACTIVE;
});

// Helper to check whether the role grants a given action on a module.
roleSchema.methods.hasPermission = function (moduleKey, action) {
  if (this.isSuperAdmin) return true;
  if (this.status !== ROLE_STATUS.ACTIVE) return false;
  const perm = this.permissions.find((p) => p.moduleKey === moduleKey);
  if (!perm) return false;
  if (action === 'read') return !!perm.read;
  if (action === 'write') return !!perm.write && !!perm.read;
  return false;
};

module.exports = mongoose.model('Role', roleSchema);
