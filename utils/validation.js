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
  if (id === undefined || id === null || id === '') {
    throw new Error(`${fieldName} is required`);
  }
  
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
 * Validate product update data
 * @param {Object} data - Update data object
 * @returns {Object} Validated and sanitized data
 * @throws {Error} If validation fails
 */
exports.validateProductUpdate = (data) => {
  const validated = {};
  const allowedFields = ['name', 'description', 'price', 'currency', 'sizes', 'defaultSize', 'colors', 'defaultColor', 'bestSeller', 'subcategory', 'rating', 'discount', 'newArrival', 'tags', 'stock', 'categoryId'];
  
  for (const [key, value] of Object.entries(data)) {
    if (!allowedFields.includes(key)) {
      throw new Error(`Invalid field: ${key}`);
    }
    
    switch (key) {
      case 'name':
      case 'description':
      case 'currency':
      case 'defaultSize':
      case 'defaultColor':
      case 'subcategory':
        if (value !== undefined) {
          validated[key] = exports.sanitize(value);
          if (!validated[key].trim()) {
            throw new Error(`${key} cannot be empty`);
          }
        }
        break;
      case 'price':
      case 'rating':
        if (value !== undefined) {
          validated[key] = exports.parsePositiveFloat(value, key);
        }
        break;
      case 'discount':
        if (value !== undefined) {
          validated[key] = exports.parseFloat(value, key);
          if (validated[key] < 0 || validated[key] > 100) {
            throw new Error('Discount must be between 0 and 100');
          }
        }
        break;
      case 'stock':
      case 'categoryId':
        if (value !== undefined) {
          validated[key] = exports.parseId(value, key);
        }
        break;
      case 'sizes':
      case 'colors':
      case 'tags':
        if (value !== undefined) {
          validated[key] = exports.validateArray(value, key);
        }
        break;
      case 'bestSeller':
      case 'newArrival':
        if (value !== undefined) {
          validated[key] = value === true || value === 'true';
        }
        break;
    }
  }
  
  return validated;
};

/**
 * Validate cart item data
 * @param {Object} data - Cart item data
 * @returns {Object} Validated data
 * @throws {Error} If validation fails
 */
exports.validateCartItem = (data) => {
  const { userid, productid, color, size, quantity } = data;
  
  exports.validateRequired(userid, 'User ID');
  exports.validateRequired(productid, 'Product ID');
  
  const validated = {
    userId: exports.parseId(userid, 'User ID'),
    productId: exports.parseId(productid, 'Product ID'),
    quantity: quantity ? exports.parseId(quantity, 'Quantity') : 1
  };
  
  if (color) validated.selectedColor = exports.sanitize(color);
  if (size) validated.selectedSize = exports.sanitize(size);
  
  return validated;
};

/**
 * Sanitize string input (trim whitespace and basic XSS prevention)
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
exports.sanitize = (value) => {
  if (typeof value === 'string') {
    return value.trim()
      .replace(/[<>"'&]/g, (match) => {
        const entities = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      });
  }
  return value;
};

/**
 * Validate and sanitize search query
 * @param {string} query - Search query to validate
 * @returns {string} Sanitized query
 * @throws {Error} If query contains suspicious patterns
 */
exports.validateSearchQuery = (query) => {
  if (typeof query !== 'string') {
    throw new Error('Search query must be a string');
  }

  // Remove potential SQL injection patterns
  const sanitized = query.trim()
    .replace(/[';"\\]/g, '') // Remove quotes and backslashes
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b/gi, ''); // Remove SQL keywords

  if (sanitized.length > 100) {
    throw new Error('Search query too long');
  }

  return sanitized;
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} true if valid
 * @throws {Error} If phone is invalid
 */
exports.validatePhone = (phone) => {
  const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
  
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format');
  }
  
  return true;
};

/**
 * Create validation middleware for request body
 * @param {Function} validator - Validation function
 * @returns {Function} Express middleware
 */
exports.createValidationMiddleware = (validator) => {
  return (req, res, next) => {
    try {
      req.validatedData = validator(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
};
