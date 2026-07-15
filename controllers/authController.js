const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendResponse } = require('../utils/apiResponse');

// @desc    Login user/admin
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendResponse(res, 400, false, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return sendResponse(res, 401, false, 'Invalid email or password');
  }

  if (!user.isActive) {
    return sendResponse(res, 403, false, 'This account has been disabled');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return sendResponse(res, 401, false, 'Invalid email or password');
  }

  const token = generateToken(user._id, user.role);

  return sendResponse(res, 200, true, 'Login successful', {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// @desc    Register a member (admin creates members) - bonus endpoint
// @route   POST /api/auth/register
// @access  Private/Admin
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return sendResponse(res, 400, false, 'Name, email and password are required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return sendResponse(res, 400, false, 'A user with this email already exists');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: role === 'admin' ? 'admin' : 'member',
  });

  return sendResponse(res, 201, true, 'User created successfully', {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });
});

// @desc    Get logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  return sendResponse(res, 200, true, 'Profile fetched', req.user);
});

module.exports = { login, register, getMe };
