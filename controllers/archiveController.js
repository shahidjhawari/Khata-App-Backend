const asyncHandler = require('express-async-handler');
const Archive = require('../models/Archive');
const { sendResponse } = require('../utils/apiResponse');
const { getDashboardSummary } = require('../services/dashboardService');

// @desc    Archive the current dashboard snapshot for a given month/year
// @route   POST /api/archive
// @access  Private/Admin
const createArchive = asyncHandler(async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return sendResponse(res, 400, false, 'month and year are required');
  }

  const existing = await Archive.findOne({ month, year });
  if (existing) {
    return sendResponse(res, 400, false, 'An archive for this month/year already exists');
  }

  const summary = await getDashboardSummary();

  const archive = await Archive.create({
    month,
    year,
    grandTotal: summary.grandTotal,
    categoryTotals: summary.categoryTotals.map((c) => ({
      category: c.categoryId,
      categoryName: c.categoryName,
      total: c.overallTotal,
    })),
    memberShares: summary.memberShares.map((m) => ({
      user: m.userId,
      userName: m.name,
      share: m.share,
      totalPaid: m.totalPaid,
      balanceDue: m.balanceDue,
    })),
    archivedBy: req.user._id,
  });

  return sendResponse(res, 201, true, 'Snapshot archived', archive);
});

// @desc    Get all archives
// @route   GET /api/archive
// @access  Private
const getArchives = asyncHandler(async (req, res) => {
  const archives = await Archive.find().sort({ year: -1, month: -1 });
  return sendResponse(res, 200, true, 'Archives fetched', archives);
});

module.exports = { createArchive, getArchives };
