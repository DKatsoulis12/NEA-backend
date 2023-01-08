// Import the SQL db connection
const { query } = require('../configs/db.config');
const jwt = require('jsonwebtoken');
const Password = require('../services/password');

const BadRequestError = require('../errors/bad-request-error');

const signUp = async (req, res) => {
  const {
    email,
    password,
    first_name,
    last_name,
    billing_address,
    shipping_address,
  } = req.body;

  // Check if the customer already exists
  const customers = await query('SELECT * FROM customers WHERE email = ?', [
    email,
  ]);

  if (customers.length > 0) {
    throw new BadRequestError('Email in use');
  }

  // Hash the password
  const hashedPassword = await Password.toHash(password);

  try {
    // Create a new customer
    const newCustomer = await query(
      'INSERT INTO customers (email, password, first_name, last_name, billing_address, shipping_address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        email,
        hashedPassword,
        first_name,
        last_name,
        billing_address,
        shipping_address,
      ]
    );

    console.log(`Customer created successfully...`);

    // Generate a JWT
    const customerJwt = jwt.sign(
      {
        id: newCustomer.insertId,
        email,
        first_name,
      },
      process.env.JWT_KEY
    );

    // Store it on session object
    req.session = { jwt: customerJwt };

    return res.status(201).send({ message: 'Customer created successfully' });
  } catch (error) {
    console.log(error);
    throw new BadRequestError('Something went wrong');
  }
};

const signIn = async (req, res) => {
  const { email, password } = req.body;

  // Check if the customer still exists
  const customers = await query('SELECT * FROM customers WHERE email = ?', [
    email,
  ]);

  if (customers.length === 0) {
    throw new BadRequestError('Invalid credentials');
  }

  // Get the customer
  const customer = customers[0];

  // Check if the password is correct
  const passwordsMatch = await Password.compare(customer.password, password);

  if (!passwordsMatch) {
    throw new BadRequestError('Invalid credentials');
  }

  // Generate a JWT
  const customerJwt = jwt.sign(
    {
      id: customer.id,
      email,
      first_name: customer.first_name,
    },
    process.env.JWT_KEY
  );

  // Store it on session object
  req.session = { jwt: customerJwt };

  return res.status(200).send({ message: 'Customer logged in successfully' });
};

const update = async (req, res) => {
  const { email, first_name, last_name, billing_address, shipping_address } =
    req.body;

  // Check if the customer still exists
  const customers = await query('SELECT * FROM customers WHERE email = ?', [
    email,
  ]);

  if (customers.length === 0) {
    throw new BadRequestError('Customer not found');
  }

  // Update the details
  try {
    const result = await query('UPDATE customers SET ? WHERE email = ?', [
      {
        first_name,
        last_name,
        billing_address,
        shipping_address,
      },
      email,
    ]);

    // Generate a JWT
    const customerJwt = jwt.sign(
      {
        id: customers[0].id,
        email,
        first_name,
      },
      process.env.JWT_KEY
    );

    // Store it on session object
    req.session = { jwt: customerJwt };

    console.log(`Customer updated successfully...`);
    res.status(200).send({ message: 'Customer updated successfully' });
  } catch (err) {
    console.log('Error while update customer: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await query('SELECT * FROM customers');

    console.log(`Found customers: ${customers.length}`);
    res.status(200).send({ customers });
  } catch (err) {
    console.log('Error while get customers: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const signOut = async (req, res) => {
  req.session = null;

  res.status(200).send({ message: 'Customer logged out' });
};

const currentUser = async (req, res) => {
  if (!req.currentUser) {
    return res.status(200).send({ currentUser: null });
  }

  return res.status(200).send({ currentUser: req.currentUser });
};

module.exports = {
  signUp,
  signIn,
  update,
  getCustomers,
  signOut,
  currentUser,
};
