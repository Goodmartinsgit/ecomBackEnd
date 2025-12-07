/**
 * Validation Middleware
 * Provides reusable validation middleware for common validation patterns
 */

const { validateRequired, parseId, sanitize, validateProductUpdate, validateCartItem } = require('../utils/validation');

/**
 * Validate ID parameter middleware
 * @param {string} paramName - Name of the parameter to validate
 */
exports.validateIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const value = req.params[paramName];
      validateRequired(value, `${paramName} parameter`);
      req.params[paramName] = parseId(value, `${paramName} parameter`);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
};

/**
 * Validate product update data middleware
 */
exports.validateProductUpdateData = (req, res, next) => {
  try {
    const { id, value } = req.body;
    validateRequired(id, 'Product ID');
    validateRequired(value, 'Update data');
    
    req.validatedData = {
      id: parseId(id, 'Product ID'),
      updateData: validateProductUpdate(value)
    };
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Validate cart item data middleware
 */
exports.validateCartItemData = (req, res, next) => {
  try {
    req.validatedData = validateCartItem(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Sanitize request body fields middleware
 * @param {string[]} fields - Array of field names to sanitize
 */
exports.sanitizeFields = (fields) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (req.body[field] !== undefined) {
          req.body[field] = sanitize(req.body[field]);
        }
      }
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
};

/**
 * Validate required fields middleware
 * @param {string[]} fields - Array of required field names
 */
exports.validateRequiredFields = (fields) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        validateRequired(req.body[field], field);
      }
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
};

/**
 * Validate order status middleware
 */
exports.validateOrderStatus = (req, res, next) => {
  try {
    const { status } = req.body;
    validateRequired(status, 'Status');
    
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'];
    const sanitizedStatus = sanitize(status);
    
    if (!validStatuses.includes(sanitizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }
    
    req.body.status = sanitizedStatus;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};