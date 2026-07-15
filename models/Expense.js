const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    quantity: {
      type: String, // e.g. "2kg", "3 pcs" - optional, kept flexible
      default: null,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Purchased By is required'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

expenseSchema.index({ category: 1, date: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
