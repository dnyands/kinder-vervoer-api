/**
 * @typedef {Object} Parent
 * @property {number} [id]
 * @property {string} name
 * @property {string} contact_number
 * @property {string} [email]
 * @property {string} [address]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Validate a parent object
 * @param {Partial<Parent>} parent
 * @returns {string[]} Array of error messages
 */
export function validateParent(parent) {
  const errors = [];
  if (!parent.name) {
    errors.push('Name is required');
  } else if (parent.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!parent.contact_number) {
    errors.push('Contact number is required');
  } else if (!/^\+?[0-9]{7,15}$/.test(parent.contact_number)) {
    errors.push('Contact number is invalid');
  }
  if (parent.email && !/^\S+@\S+\.\S+$/.test(parent.email)) {
    errors.push('Email is invalid');
  }
  return errors;
}
