const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  excludeMember,
  includeMember,
} = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.route('/').get(protect, getCategories).post(protect, adminOnly, createCategory);

router
  .route('/:id')
  .get(protect, getCategoryById)
  .put(protect, adminOnly, updateCategory)
  .delete(protect, adminOnly, deleteCategory);

router.put('/:id/exclude-member', protect, adminOnly, excludeMember);
router.put('/:id/include-member', protect, adminOnly, includeMember);

module.exports = router;
