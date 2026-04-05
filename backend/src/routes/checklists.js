const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/checklistController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/auto-match-transaction', ctrl.autoMatchTransaction);
router.put('/:id', ctrl.update);
router.patch('/:id/toggle', ctrl.toggle);
router.delete('/:id', ctrl.remove);

module.exports = router;
