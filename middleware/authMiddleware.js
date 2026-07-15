const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Verifies JWT sent as: Authorization: Bearer <token>
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found', data: null });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is disabled', data: null });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token', data: null });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided', data: null });
  }
});

// Restricts route to admin role only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Admins only.', data: null });
};

module.exports = { protect, adminOnly };
