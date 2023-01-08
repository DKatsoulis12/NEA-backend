const { body } = require('express-validator');

const router = require('express').Router();

const customerController = require('../controllers/customer.controller');
const currentUser = require('../middlewares/current-user');
const requireAuth = require('../middlewares/require-auth');
const validateRequest = require('../middlewares/validate-request');

// Create routes for sign up, sign in, sign out and current user

router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Password must within 4 and 20 characters'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
  ],
  validateRequest,
  customerController.signUp
);

router.post(
  '/signin',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Password must valid & within 4 and 20 characters'),
  ],
  validateRequest,
  customerController.signIn
);

router.put(
  '/update',
  requireAuth,
  [body('email').isEmail().withMessage('Email must be valid')],
  validateRequest,
  customerController.update
);

router.get('/', requireAuth, customerController.getCustomers);

router.get('/signout', customerController.signOut);

router.get('/currentuser', currentUser, customerController.currentUser);

module.exports = router;
