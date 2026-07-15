const Expense = require('../models/Expense');
const Category = require('../models/Category');
const User = require('../models/User');
const Payment = require('../models/Payment');
const PersonalExpense = require('../models/PersonalExpense');

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
 * Sums personal expenses tagged to a category, in the same daily/monthly/overall
 * ranges as getCategoryTotals, so they can be subtracted before splitting.
 */
const getCategoryPersonalDeductions = async (categoryId) => {
  const { startOfToday, endOfToday, startOfMonth, endOfMonth } = getDateRanges();

  const [dailyAgg, monthlyAgg, overallAgg] = await Promise.all([
    PersonalExpense.aggregate([
      { $match: { category: categoryId, date: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    PersonalExpense.aggregate([
      { $match: { category: categoryId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    PersonalExpense.aggregate([
      { $match: { category: categoryId } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
  ]);

  return {
    dailyDeduction: dailyAgg[0]?.total || 0,
    monthlyDeduction: monthlyAgg[0]?.total || 0,
    overallDeduction: overallAgg[0]?.total || 0,
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
 * Grand Total = sum of NET totals (category total minus personal expenses
 * tagged to that category) across ALL active categories.
 * Each category's net total is ALSO divided equally among active members
 * (categorySplit), in addition to the overall grand-total split.
 * Divided equally among all ACTIVE members.
 * This is recalculated live on every call - always reflects current DB state.
 */
const getDashboardSummary = async () => {
  const categories = await Category.find({ isActive: true });
  const activeMembers = await User.find({ isActive: true }).select('name email');
  const memberCount = activeMembers.length;

  const categoryTotals = await Promise.all(
    categories.map(async (cat) => {
      const totals = await getCategoryTotals(cat._id);
      const deductions = await getCategoryPersonalDeductions(cat._id);

      // Personal expenses tagged to this category are covered by the member
      // who spent them, so they come out of the shared pool before splitting.
      const netDailyTotal = Math.max(0, totals.dailyTotal - deductions.dailyDeduction);
      const netMonthlyTotal = Math.max(0, totals.monthlyTotal - deductions.monthlyDeduction);
      const netOverallTotal = Math.max(0, totals.overallTotal - deductions.overallDeduction);

      const perMemberShare =
        memberCount > 0 ? Math.round((netOverallTotal / memberCount) * 100) / 100 : 0;

      return {
        categoryId: cat._id,
        categoryName: cat.name,
        // Raw totals before any personal-expense deduction
        dailyTotal: totals.dailyTotal,
        monthlyTotal: totals.monthlyTotal,
        overallTotal: totals.overallTotal,
        // How much of this category was already personally covered
        personalDeduction: deductions.overallDeduction,
        // What's actually left to split among members
        netDailyTotal,
        netMonthlyTotal,
        netOverallTotal,
        // This category's overall net total, split equally among active members
        perMemberShare,
      };
    })
  );

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.netOverallTotal, 0);

  const perMemberShare = memberCount > 0 ? grandTotal / memberCount : 0;
  const roundedShare = Math.round(perMemberShare * 100) / 100;

  // Sum payments already made by each active member, so we can show
  // how much of their share is still due (or overpaid).
  const paymentTotals = await Payment.aggregate([
    { $match: { user: { $in: activeMembers.map((m) => m._id) } } },
    { $group: { _id: '$user', totalPaid: { $sum: '$amount' } } },
  ]);
  const paidMap = {};
  paymentTotals.forEach((p) => {
    paidMap[p._id.toString()] = p.totalPaid;
  });

  const memberShares = activeMembers.map((m) => {
    const totalPaid = Math.round((paidMap[m._id.toString()] || 0) * 100) / 100;
    const balanceDue = Math.round((roundedShare - totalPaid) * 100) / 100;
    return {
      userId: m._id,
      name: m.name,
      email: m.email,
      share: roundedShare,
      totalPaid,
      // Positive = still owes this amount, Negative = has overpaid (credit)
      balanceDue,
    };
  });

  return {
    grandTotal: Math.round(grandTotal * 100) / 100,
    categoryTotals,
    activeMemberCount: memberCount,
    perMemberShare: roundedShare,
    memberShares,
  };
};

module.exports = {
  getDateRanges,
  getCategoryTotals,
  getCategoryPersonalDeductions,
  getExpensesGroupedByDate,
  getDashboardSummary,
};
