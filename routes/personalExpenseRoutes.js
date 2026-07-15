const express = require('express');
const router = express.Router();
const {
  getPersonalExpenses,
  getPersonalExpenseById,
  createPersonalExpense,
  updatePersonalExpense,
  deletePersonalExpense,
} = require('../controllers/personalExpenseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getPersonalExpenses).post(protect, createPersonalExpense);

router
  .route('/:id')
  .get(protect, getPersonalExpenseById)
  .put(protect, updatePersonalExpense)
  .delete(protect, deletePersonalExpense);

module.exports = router;
