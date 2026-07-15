const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { sendResponse } = require('../utils/apiResponse');

// @desc    Admin adds a new member directly
// @route   POST /api/users
// @access  Private/Admin
const createMember = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return sendResponse(res, 400, false, 'Name, email and password are required');
  }

  if (password.length < 6) {
    return sendResponse(res, 400, false, 'Password must be at least 6 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return sendResponse(res, 400, false, 'A user with this email already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: role === 'admin' ? 'admin' : 'member',
    isActive: true,
  });

  const { password: _pw, ...safeUser } = user.toObject();

  return sendResponse(res, 201, true, 'Member added successfully', safeUser);
});

// @desc    Get all members
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  return sendResponse(res, 200, true, 'Members fetched', users);
});

// @desc    Update member (name, isActive, role)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return sendResponse(res, 404, false, 'Member not found');
  }

  const { name, isActive, role } = req.body;

  if (name !== undefined) user.name = name;
  if (isActive !== undefined) user.isActive = isActive; // toggling this instantly changes grand-total split
  if (role !== undefined) user.role = role;

  await user.save();

  const { password, ...safeUser } = user.toObject();
  return sendResponse(res, 200, true, 'Member updated', safeUser);
});

// @desc    Remove a member
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return sendResponse(res, 404, false, 'Member not found');
  }

  await user.deleteOne();

  return sendResponse(res, 200, true, 'Member removed');
});

module.exports = { createMember, getUsers, updateUser, deleteUser };
