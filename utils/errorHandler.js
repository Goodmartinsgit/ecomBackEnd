const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    this.data = null;

    Error.captureStackTrace(this, this.constructor);
  }

  setData(data) {
    this.data = data;
    return this;
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      return new AppError(`Duplicate field value: ${err.meta?.target?.join(', ')}. Please use another value!`, 400);
    case 'P2014':
      return new AppError('The change you are trying to make would violate the required relation constraint', 400);
    case 'P2003':
      return new AppError('Foreign key constraint failed', 400);
    case 'P2025':
      return new AppError('Record not found', 404);
    case 'P2016':
      return new AppError('Query interpretation error', 400);
    case 'P2021':
      return new AppError('The table does not exist in the current database', 500);
    case 'P2022':
      return new AppError('The column does not exist in the current database', 500);
    default:
      return new AppError('Database operation failed', 500);
  }
};

const sendErrorDev = (err, res) => {
  logger.error('ERROR 💥', {
    error: err,
    stack: err.stack,
    statusCode: err.statusCode,
    status: err.status
  });

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.error('Operational Error', {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code
    });

    const response = {
      success: false,
      message: err.message,
      code: err.code
    };

    if (err.data) {
      response.data = err.data;
    }

    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Programming Error 💥', {
      error: err,
      stack: err.stack
    });

    res.status(500).json({
      success: false,
      message: 'Something went wrong! Please try again later.',
      code: 'INTERNAL_ERROR'
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error('Error occurred', {
    method: req.method,
    path: req.path,
    statusCode: err.statusCode,
    message: err.message,
    code: err.code
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.data = err.data;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.code?.startsWith('P')) error = handlePrismaError(error);

    sendErrorProd(error, res);
  }
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => {
      // Ensure validation errors are properly handled
      if (err.message && err.message.includes('required')) {
        return next(new AppError(err.message, 400, 'VALIDATION_ERROR'));
      }
      next(err);
    });
  };
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync
};