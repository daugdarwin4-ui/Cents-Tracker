const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/transactionController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/soft-delete', ctrl.softDelete);
router.patch('/:id/restore', ctrl.restore);
router.delete('/:id', ctrl.hardDelete);

module.exports = router;
