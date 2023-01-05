const { body } = require('express-validator');

const router = require('express').Router();

const authController = require('../controllers/auth.controller');
const currentUser = require('../middlewares/current-user');
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
  authController.signUp
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
  authController.signIn
);

router.get('/signout', authController.signOut);

router.get('/currentuser', currentUser, authController.currentUser);

module.exports = router;
