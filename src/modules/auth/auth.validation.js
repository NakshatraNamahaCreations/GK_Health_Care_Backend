const { z } = require('zod');

const mobile = z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number');
const password = z.string().min(6, 'Password must be at least 6 characters');

const login = z.object({
  mobileNumber: mobile,
  password: z.string().min(1, 'Password is required'),
});

const changePassword = z
  .object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: password,
  })
  .refine((d) => d.oldPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'New password must differ from old password',
  });

module.exports = { login, changePassword };
