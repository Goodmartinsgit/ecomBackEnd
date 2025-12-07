const { prisma } = require('../config/database')
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { sendVerification, sendPasswordReset } = require("../utils/emailVerification");
const generateToken = require("../utils/generateToken");
const { sanitize, validateRequired, validateEmail, validatePassword } = require('../utils/validation');
const { AppError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');

exports.registerUser = catchAsync(async (req, res, next) => {
  let { firstname, lastname, email, phone, address, password, confirmpassword } = req.body
    // Sanitize inputs
    firstname = sanitize(firstname);
    lastname = sanitize(lastname);
    email = sanitize(email);
    phone = sanitize(phone);
    address = sanitize(address);

    // Validate required fields
    validateRequired(firstname, 'First name');
    validateRequired(lastname, 'Last name');
    validateRequired(email, 'Email');
    validateRequired(phone, 'Phone number');
    validateRequired(address, 'Address');
    validateRequired(password, 'Password');
    validateRequired(confirmpassword, 'Confirm password');

    // Validate email format
    validateEmail(email);

    // Validate password strength
    validatePassword(password);

    if (password !== confirmpassword) {
      return res.status(400).json({ success: false, message: "Password and confirm password do not match!" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    let imageUrl

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "image", "Users");
    }

    //check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      throw new AppError("User with this email already exists!", 400, 'USER_EXISTS');
    }

    // Note: role defaults to USER in schema - no need to explicitly set it
    // Admin accounts must be created directly in the database, not through registration
    const newUser = await prisma.user.create({
      data: {
        firstname,
        lastname,
        email,
        phone,
        address,
        password: hashedPassword,
        image: imageUrl || null,
      }
    });
    if (!newUser) {
      throw new AppError("User creation failed!", 400, 'USER_CREATION_FAILED');
    }

    // Generate token for immediate login after registration
    const token = generateToken(newUser);

    // Remove password from user object before sending
    const { password: _, ...userData } = newUser;

    // Send verification email asynchronously (don't wait)
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?uuid=${newUser.uuid}`;
    sendVerification(newUser.email, verificationLink).catch(err => 
      logger.error('Email verification failed:', { error: err, email: newUser.email })
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully! Check your email for verification.",
      token,
      data: userData
    });

});


exports.loginUser = catchAsync(async (req, res, next) => {
  let { email, password } = req.body;

  // Sanitize inputs
  email = sanitize(email);

  validateRequired(email, 'Email');
  validateRequired(password, 'Password');

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError("Invalid email or password!", 401, 'INVALID_CREDENTIALS');
  }

  const validatePassword = await bcrypt.compare(password, user.password);

  if (!validatePassword) {
    throw new AppError("Invalid email or password!", 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user);
  if (!token) {
    throw new AppError("Token generation failed!", 500, 'TOKEN_GENERATION_FAILED');
  }

  const { password: _, ...userData } = user;

  logger.info('User login successful', { userId: user.id, email: user.email });

  return res
    .status(200)
    .json({ success: true, message: "Login successful", token, data: userData });
});

// GET user profile
exports.getUserProfile = catchAsync(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      phone: true,
      address: true,
      image: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return res.status(200).json({
    success: true,
    data: user
  });
});

// UPDATE user profile
exports.updateUserProfile = catchAsync(async (req, res, next) => {
  let { firstname, lastname, phone, address } = req.body;

  firstname = sanitize(firstname);
  lastname = sanitize(lastname);
  phone = sanitize(phone);
  address = sanitize(address);

  let imageUrl;
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file.buffer, "image", "Users");
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(firstname && { firstname }),
      ...(lastname && { lastname }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(imageUrl && { image: imageUrl })
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      phone: true,
      address: true,
      image: true,
      role: true
    }
  });

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser
  });
});

// CHANGE password
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  validateRequired(currentPassword, 'Current password');
  validateRequired(newPassword, 'New password');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }

  validatePassword(newPassword);

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  logger.info('Password changed successfully', { userId: req.user.id });

  return res.status(200).json({
    success: true,
    message: "Password changed successfully"
  });
});

// ADMIN: Get all users with pagination and filtering
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const role = req.query.role;
  const search = req.query.search;

  const where = {};
  if (role) {
    where.role = role;
  }
  if (search) {
    where.OR = [
      { firstname: { contains: search, mode: 'insensitive' } },
      { lastname: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    }
  });
});

// ADMIN: Get user statistics
exports.getUserStats = catchAsync(async (req, res, next) => {
  const [totalUsers, adminUsers, regularUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'USER' } })
  ]);

  return res.status(200).json({
    success: true,
    data: {
      totalUsers,
      adminUsers,
      regularUsers
    }
  });
});

// FORGOT PASSWORD
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  validateRequired(email, 'Email');
  validateEmail(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link"
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedResetToken,
      resetTokenExpiry
    }
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  sendPasswordReset(user.email, resetLink).catch(err => 
    logger.error('Password reset email failed', { error: err, email: user.email })
  );

  logger.info('Password reset requested', { email });

  return res.status(200).json({
    success: true,
    message: "If an account with that email exists, we've sent a password reset link"
  });
});

// RESET PASSWORD
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;

  validateRequired(token, 'Token');
  validateRequired(newPassword, 'New password');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  validatePassword(newPassword);

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  logger.info('Password reset successfully', { userId: user.id });

  return res.status(200).json({
    success: true,
    message: "Password reset successfully"
  });
});
