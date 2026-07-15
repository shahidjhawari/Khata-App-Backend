const asyncHandler = require('express-async-handler');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { sendResponse } = require('../utils/apiResponse');

// @desc    Get expenses (optionally filter by category / date range)
// @route   GET /api/expenses?category=<id>&from=<date>&to=<date>
// @access  Private
const getExpenses = asyncHandler(async (req, res) => {
  const { category, from, to } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const expenses = await Expense.find(filter)
    .populate('category', 'name isActive')
    .populate('purchasedBy', 'name email')
    .sort({ date: -1, createdAt: -1 });

  return sendResponse(res, 200, true, 'Expenses fetched', expenses);
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('category', 'name isActive')
    .populate('purchasedBy', 'name email');

  if (!expense) {
    return sendResponse(res, 404, false, 'Expense not found');
  }

  return sendResponse(res, 200, true, 'Expense fetched', expense);
});

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private
const createExpense = asyncHandler(async (req, res) => {
  const { category, date, itemName, quantity, price, purchasedBy, notes } = req.body;

  if (!category || !date || !itemName || price === undefined || !purchasedBy) {
    return sendResponse(
      res,
      400,
      false,
      'category, date, itemName, price and purchasedBy are required'
    );
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return sendResponse(res, 404, false, 'Category not found');
  }
  if (!categoryExists.isActive) {
    return sendResponse(res, 400, false, 'Cannot add expense to a disabled category');
  }

  const expense = await Expense.create({
    category,
    date,
    itemName,
    quantity: quantity || null,
    price,
    purchasedBy,
    notes: notes || '',
  });

  const populated = await expense.populate([
    { path: 'category', select: 'name isActive' },
    { path: 'purchasedBy', select: 'name email' },
  ]);

  return sendResponse(res, 201, true, 'Expense added', populated);
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return sendResponse(res, 404, false, 'Expense not found');
  }

  const { date, itemName, quantity, price, purchasedBy, notes, category } = req.body;

  if (category !== undefined) expense.category = category;
  if (date !== undefined) expense.date = date;
  if (itemName !== undefined) expense.itemName = itemName;
  if (quantity !== undefined) expense.quantity = quantity;
  if (price !== undefined) expense.price = price;
  if (purchasedBy !== undefined) expense.purchasedBy = purchasedBy;
  if (notes !== undefined) expense.notes = notes;

  await expense.save();

  const populated = await expense.populate([
    { path: 'category', select: 'name isActive' },
    { path: 'purchasedBy', select: 'name email' },
  ]);

  return sendResponse(res, 200, true, 'Expense updated', populated);
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return sendResponse(res, 404, false, 'Expense not found');
  }

  await expense.deleteOne();

  return sendResponse(res, 200, true, 'Expense deleted');
});

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
