/**
 * Seed script - creates the default "Dukaan" and "Roti" categories.
 *
 * Usage:
 *   cd backend
 *   node seed.js
 *
 * Safe to run multiple times - skips categories that already exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const User = require('./models/User');

const DEFAULT_CATEGORIES = ['Dukaan', 'Roti'];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find an admin to attribute these categories to (optional, just for createdBy field)
    const admin = await User.findOne({ role: 'admin' });

    for (const name of DEFAULT_CATEGORIES) {
      const exists = await Category.findOne({ name });
      if (exists) {
        console.log(`- "${name}" already exists, skipping`);
        continue;
      }

      await Category.create({
        name,
        isActive: true,
        createdBy: admin ? admin._id : undefined,
      });
      console.log(`+ Created category "${name}"`);
    }

    console.log('\nDone. Categories are ready to use.');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
