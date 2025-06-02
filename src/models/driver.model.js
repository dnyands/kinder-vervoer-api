// Driver model for type safety and validation (not ORM-specific)

/**
 * @typedef {Object} Driver
 * @property {number} [id]
 * @property {string} name
 * @property {string} contact_number
 * @property {string} license_number
 * @property {string} vehicle_type
 * @property {string} vehicle_registration
 * @property {string} status
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {any} [assigned_routes]
 */

/**
 * Validate a driver object (basic, can be extended)
 * @param {Partial<Driver>} driver
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validateDriver(driver) {
  const errors = [];
  if (!driver.name) {
    errors.push('Name is required');
  } else if (driver.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!driver.contact_number) {
    errors.push('Contact number is required');
  } else if (!/^\+?[0-9]{7,15}$/.test(driver.contact_number)) {
    errors.push('Contact number is invalid');
  }
  if (!driver.license_number) {
    errors.push('License number is required');
  } else if (!/^[a-zA-Z0-9-]+$/.test(driver.license_number)) {
    errors.push('License number must be alphanumeric');
  }
  if (!driver.vehicle_type) {
    errors.push('Vehicle type is required');
  }
  if (!driver.vehicle_registration) {
    errors.push('Vehicle registration is required');
  } else if (driver.vehicle_registration.length < 2) {
    errors.push('Vehicle registration is invalid');
  }
  if (!driver.status) {
    errors.push('Status is required');
  } else if (!['active', 'inactive', 'suspended'].includes(driver.status)) {
    errors.push('Status must be active, inactive, or suspended');
  }
  return errors;
}
