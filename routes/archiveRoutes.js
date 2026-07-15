const express = require('express');
const router = express.Router();
const { createArchive, getArchives } = require('../controllers/archiveController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router
  .route('/')
  .post(protect, adminOnly, createArchive)
  .get(protect, getArchives);

module.exports = router;
