const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { sendResponse } = require('../utils/apiResponse');
const {
  getCategoryTotals,
  getIncludedMembersForCategory,
  getExpensesGroupedByDate,
} = require('../services/dashboardService');

// Builds the full totals block for one category: raw daily/monthly/overall
// totals, and the equal per-member split of the overall total among only the
// members INCLUDED in this category (exclusions respected). Personal expenses
// are a separate ledger and never affect these numbers.
const buildCategoryTotalsBlock = async (category, activeMembers) => {
  const totals = await getCategoryTotals(category._id);

  const includedMembers = getIncludedMembersForCategory(category, activeMembers);
  const excludedMembers = activeMembers.filter(
    (m) => !includedMembers.some((im) => im._id.toString() === m._id.toString())
  );

  const perMemberShare =
    includedMembers.length > 0
      ? Math.round((totals.overallTotal / includedMembers.length) * 100) / 100
      : 0;

  return {
    dailyTotal: totals.dailyTotal,
    monthlyTotal: totals.monthlyTotal,
    overallTotal: totals.overallTotal,
    perMemberShare,
    includedMembers: includedMembers.map((m) => ({ userId: m._id, name: m.name })),
    excludedMembers: excludedMembers.map((m) => ({ userId: m._id, name: m.name })),
  };
};

// @desc    Get all categories (with live totals)
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  const activeMembers = await User.find({ isActive: true }).select('name email');

  const withTotals = await Promise.all(
    categories.map(async (cat) => {
      const totals = await buildCategoryTotalsBlock(cat, activeMembers);
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

  const activeMembers = await User.find({ isActive: true }).select('name email');
  const totals = await buildCategoryTotalsBlock(category, activeMembers);
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

// @desc    Remove (exclude) a member from this category's split - the
//          category's total will then only divide among remaining members.
// @route   PUT /api/categories/:id/exclude-member
// @access  Private/Admin
const excludeMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return sendResponse(res, 400, false, 'userId is required');
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendResponse(res, 404, false, 'Category not found');
  }

  const alreadyExcluded = category.excludedMembers.some((id) => id.toString() === userId);
  if (!alreadyExcluded) {
    category.excludedMembers.push(userId);
    await category.save();
  }

  return sendResponse(res, 200, true, 'Member removed from this category\'s split', category);
});

// @desc    Add a previously-excluded member back into this category's split.
// @route   PUT /api/categories/:id/include-member
// @access  Private/Admin
const includeMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return sendResponse(res, 400, false, 'userId is required');
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendResponse(res, 404, false, 'Category not found');
  }

  category.excludedMembers = category.excludedMembers.filter((id) => id.toString() !== userId);
  await category.save();

  return sendResponse(res, 200, true, 'Member added back into this category\'s split', category);
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  excludeMember,
  includeMember,
};
