const { query } = require('../configs/db.config');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createOrder = async (req, res) => {
  const { token, note } = req.body;
  // Get the cart items for the current user
  const cartItems = await query(
    'SELECT cart_items.quantity, products.price, products.name FROM `cart_items` INNER JOIN `products` ON cart_items.product_id = products.id WHERE customer_id = ?',
    [req.currentUser.id]
  );

  const total = cartItems.reduce((acc, item) => {
    return acc + item.quantity * item.price;
  }, 0);

  const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Create new Payment

  const payment = await query(
    'INSERT INTO `payments` (`order_id`, `amount`, `token`, `payment_date`) VALUES (?, ?, ?, ?);',
    [null, total, token.id, date]
  );

  // Create a new order
  const order = await query(
    'INSERT INTO orders (total, order_date, status, note, payment_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)',
    [total, date, 'SUCCESS', note, payment.insertId, req.currentUser.id]
  );

  // Add order id into payment
  await query('UPDATE payments SET order_id = ? WHERE id = ?', [
    order.insertId,
    payment.insertId,
  ]);

  // Create order items
  const orderItems = await query(
    'INSERT INTO order_items (quantity, name, price, order_id) VALUES ?',
    [
      cartItems.map((item) => [
        item.quantity,
        item.name,
        item.price,
        order.insertId,
      ]),
    ]
  );

  // Delete cart items
  await query('DELETE FROM cart_items WHERE customer_id = ?', [
    req.currentUser.id,
  ]);

  // Create a stripe charge
  const charge = await stripe.charges.create({
    amount: total * 100,
    currency: 'gbp',
    source: token.id,
    description: `Order ${order.insertId}`,
  });

  res.status(201).send({
    message: 'Order created successfully',
  });
};

const getOrders = async (req, res) => {
  try {
    let orders;
    if (req.currentUser.isAdmin) {
      console.log('admin');
      orders = await query(
        'SELECT o.id, o.total, o.order_date, o.status, o.note, o.payment_id, o.customer_id, oi.price, oi.name, oi.quantity, c.first_name, c.last_name, c.email, c.billing_address, c.shipping_address FROM `orders` AS o INNER JOIN `order_items` AS oi ON o.id = oi.order_id INNER JOIN `customers` AS c ON o.customer_id = c.id;'
      );

      orders = orders.reduce((acc, order) => {
        const existingOrder = acc.find((o) => o.id === order.id);

        if (existingOrder) {
          existingOrder.order_items.push({
            name: order.name,
            price: order.price,
            quantity: order.quantity,
          });
        } else {
          acc.push({
            id: order.id,
            total: order.total,
            order_date: order.order_date,
            status: order.status,
            note: order.note,
            payment_id: order.payment_id,
            customer_id: order.customer_id,
            first_name: order.first_name,
            last_name: order.last_name,
            email: order.email,
            billing_address: order.billing_address,
            shipping_address: order.shipping_address,
            order_items: [
              {
                name: order.name,
                price: order.price,
                quantity: order.quantity,
              },
            ],
          });
        }

        return acc;
      }, []);
    } else {
      orders = await query(
        'SELECT o.id, o.total, o.order_date, o.status, o.note, o.payment_id, oi.price, oi.name, oi.quantity FROM `orders` AS o INNER JOIN `order_items` AS oi ON o.id = oi.order_id WHERE customer_id = ?',
        [req.currentUser.id]
      );

      orders = orders.reduce((acc, order) => {
        const existingOrder = acc.find((o) => o.id === order.id);

        if (existingOrder) {
          existingOrder.order_items.push({
            name: order.name,
            price: order.price,
            quantity: order.quantity,
          });
        } else {
          acc.push({
            id: order.id,
            total: order.total,
            order_date: order.order_date,
            status: order.status,
            note: order.note,
            payment_id: order.payment_id,
            order_items: [
              {
                name: order.name,
                price: order.price,
                quantity: order.quantity,
              },
            ],
          });
        }

        return acc;
      }, []);
    }

    console.log(`Found orders: ${orders}`);
    res.status(200).send({ orders });
  } catch (err) {
    console.log('Error while get orders: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const getOrder = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Order not found!');
  }

  try {
    const result = await query(
      'SELECT * FROM `orders` INNER JOIN `order_items` ON order_items.order_id = orders.id WHERE order_id = ?',
      [id]
    );

    if (result.length === 0) {
      throw new BadRequestError(`Order doesn't exist`);
    }

    const order = {
      id: result[0].order_id,
      total: result[0].total,
      orderDate: result[0].orderDate,
      status: result[0].status,
      note: result[0].note,
      orderItems: result.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
      })),
    };

    res.status(200).send({ order });
  } catch (err) {
    console.log('Error while get order: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const cancelOrder = async (req, res) => {
  const { id } = req.body;

  try {
    const result = await query('UPDATE orders SET status = ? WHERE id = ?', [
      'CANCELLED',
      id,
    ]);

    if (result.affectedRows === 0) {
      throw new BadRequestError(`Order doesn't exist`);
    }

    res.status(200).send({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.log('Error while cancel order: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
};
