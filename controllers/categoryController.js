const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { sendResponse } = require('../utils/apiResponse');
const {
  getCategoryTotals,
  getCategoryPersonalDeductions,
  getExpensesGroupedByDate,
} = require('../services/dashboardService');

// Builds the full totals block for one category: raw totals, personal-expense
// deduction, net totals, and the equal per-member split of the net overall total.
const buildCategoryTotalsBlock = async (categoryId, memberCount) => {
  const totals = await getCategoryTotals(categoryId);
  const deductions = await getCategoryPersonalDeductions(categoryId);

  const netDailyTotal = Math.max(0, totals.dailyTotal - deductions.dailyDeduction);
  const netMonthlyTotal = Math.max(0, totals.monthlyTotal - deductions.monthlyDeduction);
  const netOverallTotal = Math.max(0, totals.overallTotal - deductions.overallDeduction);

  const perMemberShare =
    memberCount > 0 ? Math.round((netOverallTotal / memberCount) * 100) / 100 : 0;

  return {
    dailyTotal: totals.dailyTotal,
    monthlyTotal: totals.monthlyTotal,
    overallTotal: totals.overallTotal,
    personalDeduction: deductions.overallDeduction,
    netDailyTotal,
    netMonthlyTotal,
    netOverallTotal,
    perMemberShare,
  };
};

// @desc    Get all categories (with live totals)
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  const memberCount = await User.countDocuments({ isActive: true });

  const withTotals = await Promise.all(
    categories.map(async (cat) => {
      const totals = await buildCategoryTotalsBlock(cat._id, memberCount);
      return {
        _id: cat._id,
        name: cat.name,
        isActive: cat.isActive,
        createdAt: cat.createdAt,
        ...totals,
      };
    })
  );

  return sendResponse(res, 200, true, 'Categories fetched', withTotals);
});

// @desc    Get a single category with expenses grouped by date
// @route   GET /api/categories/:id
// @access  Private
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendResponse(res, 404, false, 'Category not found');
  }

  const memberCount = await User.countDocuments({ isActive: true });
  const totals = await buildCategoryTotalsBlock(category._id, memberCount);
  const groupedExpenses = await getExpensesGroupedByDate(category._id);

  return sendResponse(res, 200, true, 'Category fetched', {
    ...category.toObject(),
    ...totals,
    expensesByDate: groupedExpenses,
  });
});

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return sendResponse(res, 400, false, 'Category name is required');
  }

  const exists = await Category.findOne({ name: name.trim() });
  if (exists) {
    return sendResponse(res, 400, false, 'Category with this name already exists');
  }

  const category = await Category.create({
    name: name.trim(),
    createdBy: req.user._id,
  });

  return sendResponse(res, 201, true, 'Category created', category);
});

// @desc    Update category - rename and/or enable/disable
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendResponse(res, 404, false, 'Category not found');
  }

  const { name, isActive } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      return sendResponse(res, 400, false, 'Category name cannot be empty');
    }
    category.name = name.trim();
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  await category.save();

  return sendResponse(res, 200, true, 'Category updated', category);
});

// @desc    Delete category - ONLY if no expense exists under it
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendResponse(res, 404, false, 'Category not found');
  }

  const expenseCount = await Expense.countDocuments({ category: category._id });
  if (expenseCount > 0) {
    return sendResponse(
      res,
      400,
      false,
      `Cannot delete category. ${expenseCount} expense(s) exist under it.`
    );
  }

  await category.deleteOne();

  return sendResponse(res, 200, true, 'Category deleted');
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
