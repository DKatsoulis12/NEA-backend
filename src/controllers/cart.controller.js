const { query } = require('../configs/db.config');
const BadRequestError = require('../errors/bad-request-error');

// --------------- CART ---------------------

// ------------------------------------------------------------------

const getCart = async (req, res) => {
  const { id } = req.currentUser;

  try {
    let cart = await query(
      'SELECT c.id, c.quantity, c.product_id, c.customer_id, p.name, p.price, p.image FROM `cart_items` AS c INNER JOIN products AS p ON p.id = c.product_id WHERE customer_id = ?',
      [id]
    );

    console.log(`Found cart items: ${cart.length}`);

    const total = cart.reduce((acc, item) => {
      return acc + item.price * item.quantity;
    }, 0);

    cart = cart.map((product) => {
      return {
        ...product,
        imageUrl: `${process.env.AWS_BUCKET_URL}/products/${product.image}`,
      };
    });

    res.status(200).send({ cart, total });
  } catch (err) {
    console.log('Error while get cart: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

const addItem = async (req, res) => {
  const { product_id } = req.body;

  // Check if product exists
  const product = await query('SELECT * FROM products WHERE id = ?', [
    product_id,
  ]);

  if (product.length === 0) {
    throw new BadRequestError(`Product doesn't exist`);
  }

  // Check if the item is already added to cart
  const items = await query(
    'SELECT * FROM cart_items WHERE product_id = ? AND customer_id = ?',
    [product_id, req.currentUser.id]
  );

  if (items.length > 0) {
    const result = await query(
      'UPDATE cart_items SET quantity = quantity + 1 WHERE product_id = ? AND customer_id = ?',
      [product_id, req.currentUser.id]
    );
  } else {
    const result = await query(
      'INSERT INTO cart_items (quantity, product_id, customer_id) VALUES (?, ?, ?)',
      [1, product_id, req.currentUser.id]
    );
  }

  res.status(200).send({ message: 'Cart item added/updated' });
};

// ------------------------------------------------------------------

const removeItem = async (req, res) => {
  const { product_id } = req.body;

  // Check if product exists
  const product = await query('SELECT * FROM products WHERE id = ?', [
    product_id,
  ]);

  if (product.length === 0) {
    throw new BadRequestError(`Product doesn't exist`);
  }

  // Check if the item is already added to cart
  const items = await query(
    'SELECT * FROM cart_items WHERE product_id = ? AND customer_id = ?',
    [product_id, req.currentUser.id]
  );

  if (items.length === 0) {
    return res.status(200).send({ message: 'No item to remove!' });
  }

  if (items[0].quantity > 1) {
    const result = await query(
      'UPDATE cart_items SET quantity = quantity - 1 WHERE product_id = ? AND customer_id = ?',
      [product_id, req.currentUser.id]
    );
  } else {
    const result = await query(
      'DELETE FROM cart_items WHERE product_id = ? AND customer_id = ?',
      [product_id, req.currentUser.id]
    );
  }

  res.status(200).send({ message: 'Cart item removed' });
};

// ------------------------------------------------------------------

module.exports = {
  getCart,
  addItem,
  removeItem,
};
