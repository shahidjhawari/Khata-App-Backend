const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { sendResponse } = require('../utils/apiResponse');

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

module.exports = { getUsers, updateUser, deleteUser };
