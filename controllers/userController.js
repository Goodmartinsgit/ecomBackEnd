const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const bcrypt = require('bcrypt');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { sendVerification } = require("../utils/emailVerification");
const generateToken = require("../utils/generateToken");

exports.registerUser = async (req, res) => {
  const { firstname, lastname, email, phone, address, password, confirmpassword } = req.body
  try {
    if (!firstname) {
      return res.status(400).json({ success: false, message: "First name is required!" })
    }
    if (!lastname) {
      return res.status(400).json({ success: false, message: "Last name is required!" })
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Missing email field!" })
    }
    if (!phone) {
      return res.status(400).json({ success: false, message: "Missing phone number field!" })
    }
    if (!address) {
      return res.status(400).json({ success: false, message: "Missing address field!" })
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Missing password field!" })
    }
    if (!confirmpassword) {
      return res.status(400).json({ success: false, message: "Missing confirm password field!" })
    }


    //validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format!" });
    }



    // Validate password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#).",
      });
    }

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
      return res.status(400).json({ success: false, message: "User with this email already exists!" });
    }

    // Note: role is NOT included here - it defaults to USER in the schema
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
        role: 'USER', // Explicitly set role to USER to prevent any tampering
      }
    });
    if (!newUser) {
      return res.status(400).json({ success: false, message: "User creation failed!" });
    }

    // Generate token for immediate login after registration
    const token = generateToken(newUser);

    // Remove password from user object before sending
    const { password: _, ...userData } = newUser;

    // Send verification email asynchronously (don't wait)
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?uuid=${newUser.uuid}`;
    sendVerification(newUser.email, verificationLink).catch(err => 
      console.error('Email verification failed:', err)
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully! Check your email for verification.",
      token,
      data: userData
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error, please try again later!", error: error.message });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email field is not provided!" });
    }
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "Password field is not provided!" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password!",
      });
    }

    const validatePassword = await bcrypt.compare(password, user.password);

    if (!validatePassword) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password!" });
    }

    const token = generateToken(user);
    if (!token) {
      return res.status(500).json({
        success: false,
        message: "Token generation failed!",
      });
    }

    const { password: _, ...userData } = user;

    return res
      .status(200)
      .json({ success: true, message: "Login successful", token, data: userData });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, please try again later!",
    });
  }
};

// GET user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// UPDATE user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstname, lastname, phone, address } = req.body;

    let imageUrl;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "image", "Users");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
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
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};

// CHANGE password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide both current and new password"
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Validate new password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#)."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
};

// ADMIN: Get all users with pagination and filtering
exports.getAllUsers = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};

// ADMIN: Get user statistics
exports.getUserStats = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics"
    });
  }
};
