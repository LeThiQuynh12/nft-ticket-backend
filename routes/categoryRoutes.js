const express = require('express');
const router = express.Router();
const catCtrl = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', catCtrl.getCategories);

// Admin CRUD
router.post('/', protect, adminOnly, catCtrl.createCategory);
router.put('/:id', protect, adminOnly, catCtrl.updateCategory);
router.delete('/:id', protect, adminOnly, catCtrl.deleteCategory);
router.get('/', protect, adminOnly, catCtrl.getCategories);

module.exports = router;
