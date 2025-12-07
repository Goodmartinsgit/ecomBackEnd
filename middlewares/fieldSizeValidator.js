// Field size validation middleware
const MAX_STRING_LENGTH = 10000; // 10KB per string field
const MAX_ARRAY_LENGTH = 100; // Max array items
const MAX_OBJECT_DEPTH = 5; // Max nested object depth

const validateFieldSize = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  try {
    checkObject(req.body, 0);
    next();
  } catch (error) {
    return res.status(413).json({
      success: false,
      message: error.message || 'Request field size exceeds limit'
    });
  }
};

function checkObject(obj, depth) {
  if (depth > MAX_OBJECT_DEPTH) {
    throw new Error('Object nesting too deep');
  }

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      throw new Error(`Field '${key}' exceeds maximum length of ${MAX_STRING_LENGTH} characters`);
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        throw new Error(`Array '${key}' exceeds maximum length of ${MAX_ARRAY_LENGTH} items`);
      }
      value.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          checkObject(item, depth + 1);
        } else if (typeof item === 'string' && item.length > MAX_STRING_LENGTH) {
          throw new Error(`Array item in '${key}' exceeds maximum string length`);
        }
      });
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      checkObject(value, depth + 1);
    }
  }
}

module.exports = validateFieldSize;
