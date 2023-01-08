const { body } = require('express-validator');
const requireAuth = require('../middlewares/require-auth');
const validateRequest = require('../middlewares/validate-request');

const cartController = require('../controllers/cart.controller');

const router = require('express').Router();

// Get cart
router.get('/', requireAuth, cartController.getCart);

router.post(
  '/add-item',
  requireAuth,
  [body('product_id').isNumeric().withMessage('Product ID is required')],
  validateRequest,
  cartController.addItem
);

router.post(
  '/remove-item',
  requireAuth,
  [body('product_id').isNumeric().withMessage('Product ID is required')],
  validateRequest,
  cartController.removeItem
);

module.exports = router;
