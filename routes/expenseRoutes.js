const express = require('express');
const router = express.Router();
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Only the admin manages category (shared) expenses - members can view them.
router.route('/').get(protect, getExpenses).post(protect, adminOnly, createExpense);

router
  .route('/:id')
  .get(protect, getExpenseById)
  .put(protect, adminOnly, updateExpense)
  .delete(protect, adminOnly, deleteExpense);

module.exports = router;
