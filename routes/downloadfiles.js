const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { downloadExpenses, getDownloadHistory } = require('../controllers/download');
const isPremiumUser = require('../middlewares/ispremiumuser');

const router = express.Router();

router.get('/download', authenticate, isPremiumUser, downloadExpenses);
router.get('/download-history', authenticate, isPremiumUser, getDownloadHistory);

module.exports = router;
