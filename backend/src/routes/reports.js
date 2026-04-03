const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(auth);

router.get('/summary', ctrl.summary);
router.get('/monthly', ctrl.monthly);
router.get('/yearly', ctrl.yearly);
router.get('/export/transactions', ctrl.exportTransactions);
router.get('/export/monthly', ctrl.exportMonthly);

module.exports = router;
