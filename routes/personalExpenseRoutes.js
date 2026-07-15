const express = require('express');
const router = express.Router();
const {
  getPersonalExpenseSummary,
  getPersonalExpenses,
  getPersonalExpenseById,
  createPersonalExpense,
  updatePersonalExpense,
  deletePersonalExpense,
} = require('../controllers/personalExpenseController');
const { protect } = require('../middleware/authMiddleware');

// Must come before /:id so "summary" isn't treated as an :id param
router.get('/summary', protect, getPersonalExpenseSummary);

router.route('/').get(protect, getPersonalExpenses).post(protect, createPersonalExpense);

router
  .route('/:id')
  .get(protect, getPersonalExpenseById)
  .put(protect, updatePersonalExpense)
  .delete(protect, deletePersonalExpense);

module.exports = router;
