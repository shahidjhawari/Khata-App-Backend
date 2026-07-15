const asyncHandler = require('express-async-handler');
const PersonalExpense = require('../models/PersonalExpense');
const User = require('../models/User');
const { sendResponse } = require('../utils/apiResponse');

// @desc    List all active members with their personal-expense totals
//          (daily / monthly / overall). Used to power the "Personal Expense"
//          entry screen: tap a member from this list to add an expense for them.
// @route   GET /api/personal-expenses/summary
// @access  Private
const getPersonalExpenseSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Members: admin sees everyone active, a regular member only sees themself
  const memberFilter =
    req.user.role === 'admin' ? { isActive: true } : { _id: req.user._id, isActive: true };
  const members = await User.find(memberFilter).select('name email');

  const summary = await Promise.all(
    members.map(async (m) => {
      const [dailyAgg, monthlyAgg, overallAgg] = await Promise.all([
        PersonalExpense.aggregate([
          { $match: { user: m._id, date: { $gte: startOfToday, $lte: endOfToday } } },
          { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        PersonalExpense.aggregate([
          { $match: { user: m._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
          { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        PersonalExpense.aggregate([
          { $match: { user: m._id } },
          { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
      ]);

      return {
        userId: m._id,
        name: m.name,
        email: m.email,
        dailyTotal: dailyAgg[0]?.total || 0,
        monthlyTotal: monthlyAgg[0]?.total || 0,
        overallTotal: overallAgg[0]?.total || 0,
      };
    })
  );

  return sendResponse(res, 200, true, 'Personal expense summary fetched', summary);
});

// @desc    Get personal expenses (admin sees all, member sees own)
// @route   GET /api/personal-expenses
// @access  Private
const getPersonalExpenses = asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'admin') {
    // Admin can view a specific member's expenses via ?user=<id>, or everyone's if omitted
    filter = req.query.user ? { user: req.query.user } : {};
  } else {
    filter = { user: req.user._id };
  }

  const expenses = await PersonalExpense.find(filter)
    .populate('user', 'name email')
    .populate('category', 'name')
    .sort({ date: -1, createdAt: -1 });

  return sendResponse(res, 200, true, 'Personal expenses fetched', expenses);
});

// @desc    Get single personal expense
// @route   GET /api/personal-expenses/:id
// @access  Private
const getPersonalExpenseById = asyncHandler(async (req, res) => {
  const expense = await PersonalExpense.findById(req.params.id)
    .populate('user', 'name email')
    .populate('category', 'name');
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
  const { date, itemName, quantity, price, notes, category, user } = req.body;

  if (!date || !itemName || price === undefined) {
    return sendResponse(res, 400, false, 'date, itemName and price are required');
  }

  // Admin can add this expense for any member (e.g. tapped their name from the
  // member list). A regular member can only add expenses for themselves.
  const targetUser = req.user.role === 'admin' && user ? user : req.user._id;

  if (req.user.role === 'admin' && user) {
    const memberExists = await User.findById(user);
    if (!memberExists) {
      return sendResponse(res, 404, false, 'Member not found');
    }
  }

  const expense = await PersonalExpense.create({
    user: targetUser,
    category: category || null,
    date,
    itemName,
    quantity: quantity || null,
    price,
    notes: notes || '',
  });

  const populated = await expense.populate([
    { path: 'user', select: 'name email' },
    { path: 'category', select: 'name' },
  ]);

  return sendResponse(res, 201, true, 'Personal expense added', populated);
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

  const { date, itemName, quantity, price, notes, category } = req.body;

  if (date !== undefined) expense.date = date;
  if (itemName !== undefined) expense.itemName = itemName;
  if (quantity !== undefined) expense.quantity = quantity;
  if (price !== undefined) expense.price = price;
  if (notes !== undefined) expense.notes = notes;
  if (category !== undefined) expense.category = category || null;

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
  getPersonalExpenseSummary,
  getPersonalExpenses,
  getPersonalExpenseById,
  createPersonalExpense,
  updatePersonalExpense,
  deletePersonalExpense,
};
