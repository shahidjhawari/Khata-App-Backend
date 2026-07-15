const asyncHandler = require('express-async-handler');
const { sendResponse } = require('../utils/apiResponse');
const { getDashboardSummary } = require('../services/dashboardService');

// @desc    Get dashboard report: grand total, category totals, member shares
//          Recalculated live on every request - always reflects current DB state.
// @route   GET /api/reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary();
  return sendResponse(res, 200, true, 'Dashboard report generated', summary);
});

module.exports = { getReports };
