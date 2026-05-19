const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_STATUS, USER_STATUS_VALUES } = require('../../constants/status');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // 10-digit Indian mobile numbers; tighten/loosen as needed.
      match: [/^[6-9]\d{9}$/, 'Invalid mobile number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never returned by default
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    department: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    profileImage: { type: String, default: '' },
    fcmTokens: { type: [String], default: [] },
    lastLoginAt: { type: Date },
    passwordResetRequired: { type: Boolean, default: false },
    status: {
      type: String,
      enum: USER_STATUS_VALUES,
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Search/listing helpers
userSchema.index({ name: 'text', mobileNumber: 1, email: 1 });

// Hash password on save when modified.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.virtual('isActive').get(function () {
  return this.status === USER_STATUS.ACTIVE;
});

// Ensure password is stripped even if some code path attaches it.
const stripSensitive = (_doc, ret) => {
  delete ret.password;
  delete ret.fcmTokens; // internal use only
  return ret;
};
userSchema.set('toJSON', { transform: stripSensitive, virtuals: false });
userSchema.set('toObject', { transform: stripSensitive, virtuals: false });

module.exports = mongoose.model('User', userSchema);
