const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const { sendResponse } = require('../utils/apiResponse');

// @desc    Get payments (admin sees all, member sees own)
// @route   GET /api/payments
// @access  Private
const getPayments = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { user: req.user._id };

  const payments = await Payment.find(filter)
    .populate('user', 'name email')
    .sort({ date: -1, createdAt: -1 });

  return sendResponse(res, 200, true, 'Payments fetched', payments);
});

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('user', 'name email');
  if (!payment) {
    return sendResponse(res, 404, false, 'Payment not found');
  }

  if (req.user.role !== 'admin' && String(payment.user._id) !== String(req.user._id)) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  return sendResponse(res, 200, true, 'Payment fetched', payment);
});

// @desc    Create payment
// @route   POST /api/payments
// @access  Private
const createPayment = asyncHandler(async (req, res) => {
  const { user, amount, date, notes } = req.body;

  if (!amount || !date) {
    return sendResponse(res, 400, false, 'amount and date are required');
  }

  // Admin can log a payment on behalf of any member; member can only log their own
  const targetUser = req.user.role === 'admin' && user ? user : req.user._id;

  const payment = await Payment.create({
    user: targetUser,
    amount,
    date,
    notes: notes || '',
  });

  return sendResponse(res, 201, true, 'Payment recorded', payment);
});

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private
const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return sendResponse(res, 404, false, 'Payment not found');
  }

  if (req.user.role !== 'admin' && String(payment.user) !== String(req.user._id)) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  const { amount, date, notes } = req.body;

  if (amount !== undefined) payment.amount = amount;
  if (date !== undefined) payment.date = date;
  if (notes !== undefined) payment.notes = notes;

  await payment.save();

  return sendResponse(res, 200, true, 'Payment updated', payment);
});

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private
const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return sendResponse(res, 404, false, 'Payment not found');
  }

  if (req.user.role !== 'admin' && String(payment.user) !== String(req.user._id)) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  await payment.deleteOne();

  return sendResponse(res, 200, true, 'Payment deleted');
});

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};
