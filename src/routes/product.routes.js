const { body } = require('express-validator');
const requireAuth = require('../middlewares/require-auth');
const validateRequest = require('../middlewares/validate-request');

const productController = require('../controllers/product.controller');

const router = require('express').Router();

// Get signed URL for uploading image to S3
router.get('/upload', requireAuth, productController.getUploadURL);

// Create Product
router.post(
  '/',
  requireAuth,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price')
      .isFloat()
      .withMessage('Price is required and must be greater than 0'),
    body('category_id').notEmpty().withMessage('Category Id is required'),
  ],
  validateRequest,
  productController.createProduct
);

// Get Products
router.get('/', productController.getProducts);

// Get Featured Products
router.get('/featured', productController.getFeaturedProducts);

// Get Product
router.get('/:id', productController.getProduct);

// Update Product
router.put(
  '/',
  requireAuth,
  [
    body('id').notEmpty().withMessage('ID is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price')
      .isFloat()
      .withMessage('Price is required and must be greater than 0'),
    body('category_id').notEmpty().withMessage('Category Id is required'),
  ],
  validateRequest,
  productController.updateProduct
);

// Delete Product
router.delete(
  '/',
  requireAuth,
  [body('id').notEmpty().withMessage('ID is required')],
  validateRequest,
  productController.deleteProduct
);

module.exports = router;
