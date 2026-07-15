const express = require('express');
const router = express.Router();
const { login, signup, register, getMe } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/signup', signup); // public - admin@admin.com auto becomes admin
router.post('/login', login);
router.post('/register', protect, adminOnly, register); // admin creates member accounts
router.get('/me', protect, getMe);

module.exports = router;
