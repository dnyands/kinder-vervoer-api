/**
 * @typedef {Object} Route
 * @property {number} [id]
 * @property {string} name
 * @property {string} start_location
 * @property {string} end_location
 * @property {string} [schedule_time]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Validate a route object
 * @param {Partial<Route>} route
 * @returns {string[]} Array of error messages
 */
export function validateRoute(route) {
  const errors = [];
  if (!route.name) {
    errors.push('Name is required');
  } else if (route.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!route.start_location) {
    errors.push('Start location is required');
  }
  if (!route.end_location) {
    errors.push('End location is required');
  }
  if (route.schedule_time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(route.schedule_time)) {
    errors.push('Schedule time must be in HH:MM format');
  }
  return errors;
}
