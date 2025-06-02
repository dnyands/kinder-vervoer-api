/**
 * @typedef {Object} Student
 * @property {number} [id]
 * @property {string} name
 * @property {string} grade
 * @property {number} parent_id
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Validate a student object
 * @param {Partial<Student>} student
 * @returns {string[]} Array of error messages
 */
export function validateStudent(student) {
  const errors = [];
  if (!student.name) {
    errors.push('Name is required');
  } else if (student.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!student.grade) {
    errors.push('Grade is required');
  }
  if (!student.parent_id || !Number.isInteger(student.parent_id)) {
    errors.push('Parent ID is required and must be an integer');
  }
  return errors;
}
