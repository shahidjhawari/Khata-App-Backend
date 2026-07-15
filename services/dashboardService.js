const Expense = require('../models/Expense');
const Category = require('../models/Category');
const User = require('../models/User');

/**
 * Returns start/end of "today" and "this month" as Date objects (server local time).
 */
const getDateRanges = () => {
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { startOfToday, endOfToday, startOfMonth, endOfMonth };
};

/**
 * Computes Daily Total / Monthly Total / Overall Total for a single category.
 */
const getCategoryTotals = async (categoryId) => {
  const { startOfToday, endOfToday, startOfMonth, endOfMonth } = getDateRanges();

  const [dailyAgg, monthlyAgg, overallAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { category: categoryId, date: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    Expense.aggregate([
      { $match: { category: categoryId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    Expense.aggregate([
      { $match: { category: categoryId } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
  ]);

  return {
    dailyTotal: dailyAgg[0]?.total || 0,
    monthlyTotal: monthlyAgg[0]?.total || 0,
    overallTotal: overallAgg[0]?.total || 0,
  };
};

/**
 * Groups a category's expenses by date (YYYY-MM-DD) with a running daily total each.
 */
const getExpensesGroupedByDate = async (categoryId) => {
  const expenses = await Expense.find({ category: categoryId })
    .populate('purchasedBy', 'name email')
    .sort({ date: -1, createdAt: -1 });

  const grouped = {};
  expenses.forEach((exp) => {
    const key = exp.date.toISOString().split('T')[0];
    if (!grouped[key]) {
      grouped[key] = { date: key, items: [], dailyTotal: 0 };
    }
    grouped[key].items.push(exp);
    grouped[key].dailyTotal += exp.price;
  });

  return Object.values(grouped).sort((a, b) => (a.date < b.date ? 1 : -1));
};

/**
 * Grand Total = sum of overall totals of ALL active categories.
 * Divided equally among all ACTIVE members.
 * This is recalculated live on every call - always reflects current DB state.
 */
const getDashboardSummary = async () => {
  const categories = await Category.find({ isActive: true });

  const categoryTotals = await Promise.all(
    categories.map(async (cat) => {
      const totals = await getCategoryTotals(cat._id);
      return {
        categoryId: cat._id,
        categoryName: cat.name,
        ...totals,
      };
    })
  );

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.overallTotal, 0);

  const activeMembers = await User.find({ isActive: true }).select('name email');
  const memberCount = activeMembers.length;
  const perMemberShare = memberCount > 0 ? grandTotal / memberCount : 0;

  const memberShares = activeMembers.map((m) => ({
    userId: m._id,
    name: m.name,
    email: m.email,
    share: Math.round(perMemberShare * 100) / 100,
  }));

  return {
    grandTotal: Math.round(grandTotal * 100) / 100,
    categoryTotals,
    activeMemberCount: memberCount,
    perMemberShare: Math.round(perMemberShare * 100) / 100,
    memberShares,
  };
};

module.exports = {
  getDateRanges,
  getCategoryTotals,
  getExpensesGroupedByDate,
  getDashboardSummary,
};
