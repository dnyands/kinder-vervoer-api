/**
 * @typedef {Object} Rating
 * @property {number} [id]
 * @property {number} driver_id
 * @property {number} parent_id
 * @property {number} rating
 * @property {string} [comment]
 * @property {string} [created_at]
 */

/**
 * Validate a rating object
 * @param {Partial<Rating>} rating
 * @returns {string[]} Array of error messages
 */
export function validateRating(rating) {
  const errors = [];
  if (!rating.driver_id || !Number.isInteger(rating.driver_id)) {
    errors.push('Driver ID is required and must be an integer');
  }
  if (!rating.parent_id || !Number.isInteger(rating.parent_id)) {
    errors.push('Parent ID is required and must be an integer');
  }
  if (typeof rating.rating !== 'number' || rating.rating < 1 || rating.rating > 5) {
    errors.push('Rating must be a number between 1 and 5');
  }
  if (rating.comment && rating.comment.length > 500) {
    errors.push('Comment must be less than 500 characters');
  }
  return errors;
}
