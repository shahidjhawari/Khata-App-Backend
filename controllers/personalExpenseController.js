const asyncHandler = require('express-async-handler');
const PersonalExpense = require('../models/PersonalExpense');
const { sendResponse } = require('../utils/apiResponse');

// @desc    Get personal expenses (admin sees all, member sees own)
// @route   GET /api/personal-expenses
// @access  Private
const getPersonalExpenses = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { user: req.user._id };

  const expenses = await PersonalExpense.find(filter)
    .populate('user', 'name email')
    .sort({ date: -1, createdAt: -1 });

  return sendResponse(res, 200, true, 'Personal expenses fetched', expenses);
});

// @desc    Get single personal expense
// @route   GET /api/personal-expenses/:id
// @access  Private
const getPersonalExpenseById = asyncHandler(async (req, res) => {
  const expense = await PersonalExpense.findById(req.params.id).populate('user', 'name email');
  if (!expense) {
    return sendResponse(res, 404, false, 'Personal expense not found');
  }

  if (req.user.role !== 'admin' && String(expense.user._id) !== String(req.user._id)) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  return sendResponse(res, 200, true, 'Personal expense fetched', expense);
});

// @desc    Create personal expense
// @route   POST /api/personal-expenses
// @access  Private
const createPersonalExpense = asyncHandler(async (req, res) => {
  const { date, itemName, quantity, price, notes } = req.body;

  if (!date || !itemName || price === undefined) {
    return sendResponse(res, 400, false, 'date, itemName and price are required');
  }

  const expense = await PersonalExpense.create({
    user: req.user._id,
    date,
    itemName,
    quantity: quantity || null,
    price,
    notes: notes || '',
  });

  return sendResponse(res, 201, true, 'Personal expense added', expense);
});

// @desc    Update personal expense
// @route   PUT /api/personal-expenses/:id
// @access  Private
const updatePersonalExpense = asyncHandler(async (req, res) => {
  const expense = await PersonalExpense.findById(req.params.id);
  if (!expense) {
    return sendResponse(res, 404, false, 'Personal expense not found');
  }

  if (req.user.role !== 'admin' && String(expense.user) !== String(req.user._id)) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  const { date, itemName, quantity, price, notes } = req.body;

  if (date !== undefined) expense.date = date;
  if (itemName !== undefined) expense.itemName = itemName;
  if (quantity !== undefined) expense.quantity = quantity;
  if (price !== undefined) expense.price = price;
  if (notes !== undefined) expense.notes = notes;

  await expense.save();

  return sendResponse(res, 200, true, 'Personal expense updated', expense);
});

// @desc    Delete personal expense
// @route   DELETE /api/personal-expenses/:id
// @access  Private
const deletePersonalExpense = asyncHandler(async (req, res) => {
  const expense = await PersonalExpense.findById(req.params.id);
  if (!expense) {
    return sendResponse(res, 404, false, 'Personal expense not found');
  }

  if (req.user.role !== 'admin' && String(expense.user) !== String(req.user._id)) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  await expense.deleteOne();

  return sendResponse(res, 200, true, 'Personal expense deleted');
});

module.exports = {
  getPersonalExpenses,
  getPersonalExpenseById,
  createPersonalExpense,
  updatePersonalExpense,
  deletePersonalExpense,
};
