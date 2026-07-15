const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const { sendResponse } = require('../utils/apiResponse');
const { getCategoryTotals, getExpensesGroupedByDate } = require('../services/dashboardService');

// @desc    Get all categories (with live totals)
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });

  const withTotals = await Promise.all(
    categories.map(async (cat) => {
      const totals = await getCategoryTotals(cat._id);
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

  const totals = await getCategoryTotals(category._id);
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
