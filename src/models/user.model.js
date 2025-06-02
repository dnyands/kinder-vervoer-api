/**
 * @typedef {Object} User
 * @property {number} [id]
 * @property {string} email
 * @property {string} password
 * @property {string} [role]
 * @property {string} [first_name]
 * @property {string} [last_name]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Validate a user object
 * @param {Partial<User>} user
 * @returns {string[]} Array of error messages
 */
export function validateUser(user) {
  const errors = [];
  if (!user.email) {
    errors.push('Email is required');
  } else if (!/^\S+@\S+\.\S+$/.test(user.email)) {
    errors.push('Email is invalid');
  }
  if (!user.password) {
    errors.push('Password is required');
  } else if (user.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!user.role) {
    errors.push('Role is required');
  } else if (!['admin', 'parent', 'driver'].includes(user.role)) {
    errors.push('Role must be admin, parent, or driver');
  }
  return errors;
}
