/**
 * @typedef {Object} Subscription
 * @property {number} [id]
 * @property {number} student_id
 * @property {number} route_id
 * @property {string} status
 * @property {string} [start_date]
 * @property {string} [end_date]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Validate a subscription object
 * @param {Partial<Subscription>} subscription
 * @returns {string[]} Array of error messages
 */
export function validateSubscription(subscription) {
  const errors = [];
  if (!subscription.student_id || !Number.isInteger(subscription.student_id)) {
    errors.push('Student ID is required and must be an integer');
  }
  if (!subscription.route_id || !Number.isInteger(subscription.route_id)) {
    errors.push('Route ID is required and must be an integer');
  }
  if (!subscription.status) {
    errors.push('Status is required');
  } else if (!['active', 'inactive', 'expired'].includes(subscription.status)) {
    errors.push('Status must be active, inactive, or expired');
  }
  if (subscription.start_date && subscription.end_date) {
    const start = new Date(subscription.start_date);
    const end = new Date(subscription.end_date);
    if (start > end) {
      errors.push('Start date must be before end date');
    }
  }
  return errors;
}
