// Shared status enums. Centralized so the same string literals are used everywhere.

const USER_STATUS = Object.freeze({
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
});

const ROLE_STATUS = Object.freeze({
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
});

module.exports = {
  USER_STATUS,
  USER_STATUS_VALUES: Object.values(USER_STATUS),
  ROLE_STATUS,
  ROLE_STATUS_VALUES: Object.values(ROLE_STATUS),
};
