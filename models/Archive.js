const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema(
  {
    month: {
      type: Number, // 1-12
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    sharedCategoryTotal: Number,
    grandPersonalTotal: Number,
    categoryTotals: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
        categoryName: String,
        total: Number, // raw overall total before deduction
        personalDeduction: Number,
        netTotal: Number, // total actually split among included members
        perMemberShare: Number,
        includedMemberNames: [String],
        excludedMemberNames: [String],
      },
    ],
    memberShares: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        categoryShare: Number,
        personalTotal: Number,
        share: Number,
        totalPaid: Number,
        balanceDue: Number,
      },
    ],
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

archiveSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Archive', archiveSchema);
