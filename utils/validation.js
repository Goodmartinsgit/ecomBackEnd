/**
 * Backend Validation Utilities
 * Provides reusable validation and parsing functions for backend
 */

/**
 * Parse and validate an ID (convert string to positive integer)
 * @param {string|number} id - ID to parse
 * @param {string} fieldName - Name of the field for error message
 * @returns {number} Parsed ID
 * @throws {Error} If ID is invalid
 */
exports.parseId = (id, fieldName = 'ID') => {
  const parsed = parseInt(id, 10);

  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}: must be a positive integer`);
  }

  return parsed;
};

/**
 * Parse and validate a float value
 * @param {string|number} value - Value to parse
 * @param {string} fieldName - Name of the field for error message
 * @returns {number} Parsed float
 * @throws {Error} If value is invalid
 */
exports.parseFloat = (value, fieldName = 'Value') => {
  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }

  return parsed;
};

/**
 * Parse and validate a positive float value
 * @param {string|number} value - Value to parse
 * @param {string} fieldName - Name of the field for error message
 * @returns {number} Parsed float
 * @throws {Error} If value is invalid or not positive
 */
exports.parsePositiveFloat = (value, fieldName = 'Value') => {
  const parsed = parseFloat(value);

  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}: must be a positive number`);
  }

  return parsed;
};

/**
 * Validate required field
 * @param {any} value - Value to check
 * @param {string} fieldName - Name of the field for error message
 * @throws {Error} If value is missing
 */
exports.validateRequired = (value, fieldName) => {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${fieldName} is required`);
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} true if valid
 * @throws {Error} If email is invalid
 */
exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return true;
};

/**
 * Validate password strength
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 * @param {string} password - Password to validate
 * @returns {boolean} true if valid
 * @throws {Error} If password is weak
 */
exports.validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  if (!passwordRegex.test(password)) {
    throw new Error(
      'Password must be at least 8 characters and include: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#).'
    );
  }

  return true;
};

/**
 * Validate array of values
 * @param {any} value - Value to check
 * @param {string} fieldName - Name of the field for error message
 * @returns {Array} Parsed array
 * @throws {Error} If value is not an array
 */
exports.validateArray = (value, fieldName = 'Value') => {
  if (Array.isArray(value)) {
    return value;
  }

  // Try to parse as JSON if it's a string
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      throw new Error(`Invalid ${fieldName}: must be an array`);
    }
  }

  throw new Error(`Invalid ${fieldName}: must be an array`);
};

/**
 * Sanitize string input (trim whitespace)
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
exports.sanitize = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
};
