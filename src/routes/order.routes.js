const { body } = require('express-validator');
const validateRequest = require('../middlewares/validate-request');
const requireAuth = require('../middlewares/require-auth');

const orderController = require('../controllers/order.controller');

const router = require('express').Router();

router.post(
  '/',
  requireAuth,
  [body('token').notEmpty().withMessage('Token is required')],
  validateRequest,
  orderController.createOrder
);

router.get('/', requireAuth, orderController.getOrders);

router.get('/:id', requireAuth, orderController.getOrder);

router.post(
  '/cancel',
  requireAuth,
  [body('id').notEmpty().withMessage('Order Id is required')],
  validateRequest,
  orderController.cancelOrder
);

module.exports = router;
