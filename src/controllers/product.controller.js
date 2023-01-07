const { query } = require('../configs/db.config');
const BadRequestError = require('../errors/bad-request-error');
const s3 = require('../configs/aws.config');

// ------------------------------------------------------------------

const getUploadURL = async (req, res) => {
  const { filename, fileType } = req.query;

  if (!filename) {
    throw new BadRequestError('Filename is required');
  }

  if (!fileType) {
    throw new BadRequestError('File Type is required');
  }

  const url = await s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: 'products/' + filename,
    ContentType: fileType,
    Expires: 60 * 5,
  });

  console.log('Upload URL generated successfully...');
  res.status(200).send({ url });
};

// ------------------------------------------------------------------

const createProduct = async (req, res) => {
  const { name, description, isActive, image, isFeatured, price, category_id } =
    req.body;

  // Check if product with same name exists
  const cleanName = name.trim();

  const products = await query('SELECT * FROM products WHERE name = ?', [
    cleanName,
  ]);

  if (products.length > 0) {
    throw new BadRequestError('Product already exists!');
  }

  // Check if category exists
  const category = await query('SELECT * FROM categories WHERE id = ?', [
    category_id,
  ]);

  if (category.length === 0) {
    throw new BadRequestError('Category does not exist');
  }

  try {
    const newProduct = await query(
      'INSERT INTO products (name, description, isActive, image, isFeatured, price, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        cleanName,
        description,
        isActive ? isActive : true,
        image,
        isFeatured ? isFeatured : false,
        price,
        category_id,
      ]
    );

    console.log(`Product created successfully...`);

    res.status(201).send({ message: 'Product created successfully' });
  } catch (err) {
    console.log('Error while create product: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

const getProducts = async (req, res) => {
  try {
    let products = await query(
      'SELECT products.id AS id, products.name AS name, products.description AS description, products.isActive AS isActive, products.image AS image, products.isFeatured AS isFeatured, products.price AS price, products.category_id AS category_id, categories.name AS category FROM `products` INNER JOIN categories ON products.category_id = categories.id'
    );

    products = products.map((product) => {
      return {
        ...product,
        imageUrl: `${process.env.AWS_BUCKET_URL}/products/${product.image}`,
      };
    });

    console.log(`Found products: ${products.length}`);
    res.status(200).send({ products });
  } catch (err) {
    console.log('Error while get products: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await query(
      'SELECT products.id AS id, products.name AS name, products.description AS description, products.isActive AS isActive, products.image AS image, products.isFeatured AS isFeatured, products.price AS price, products.category_id AS category_id, categories.name AS category FROM `products` INNER JOIN categories ON products.category_id = categories.id WHERE isFeatured = 1'
    );

    console.log(`Found featured products: ${featuredProducts.length}`);

    featuredProducts = featuredProducts.map((product) => {
      return {
        ...product,
        imageUrl: `${process.env.AWS_BUCKET_URL}/products/${product.image}`,
      };
    });

    res.status(200).send({ featuredProducts });
  } catch (err) {
    console.log('Error while get featured products: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

const getProduct = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Product not found!');
  }

  try {
    let result = await query('SELECT * FROM products WHERE id = ?', [id]);

    if (result.length === 0) {
      throw new BadRequestError(`Product doesn't exist`);
    }

    let product = result[0];

    product = {
      ...product,
      imageUrl: await s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: 'products/' + product.image,
      }),
    };

    console.log(`Product found: ${product.name}`);

    res.status(200).send({ product });
  } catch (err) {
    console.log('Error while get product: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

const updateProduct = async (req, res) => {
  const {
    id,
    name,
    description,
    isActive,
    oldImage,
    image,
    isFeatured,
    price,
    category_id,
  } = req.body;

  const product = await query('SELECT * FROM products WHERE id = ?', [id]);

  if (product.length === 0) {
    throw new BadRequestError(`Product doesn't exist`);
  }

  // Check if category exists
  const category = await query('SELECT * FROM categories WHERE id = ?', [
    category_id,
  ]);

  if (category.length === 0) {
    throw new BadRequestError('Category does not exist');
  }

  if (oldImage !== image) {
    await s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: 'categories/' + oldImage,
      })
      .promise();
  }

  try {
    const result = await query('UPDATE products SET ? WHERE id = ?', [
      {
        name,
        description,
        isActive: isActive ? isActive : true,
        image,
        isFeatured: isFeatured ? isFeatured : false,
        price,
        category_id,
      },
      id,
    ]);

    console.log(`Product updated successfully... ${result}`);
    res.status(200).send({ message: 'Product updated successfully' });
  } catch (err) {
    console.log('Error while update product: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

const deleteProduct = async (req, res) => {
  const { id } = req.body;

  // Check if product exists
  const product = await query('SELECT * FROM products WHERE id = ?', [id]);

  if (product.length === 0) {
    throw new BadRequestError(`Product doesn't exist`);
  }

  // delete the image from the s3 bucket
  const productImage = product[0].image;
  await s3
    .deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: 'products/' + productImage,
    })
    .promise();

  try {
    const result = await query('DELETE FROM products WHERE id =? ', [id]);

    console.log('Product deleted...');

    res.status(200).send({ message: 'Product deleted successfully' });
  } catch (err) {
    console.log('Error while deleting product: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

// ------------------------------------------------------------------

module.exports = {
  createProduct,
  getProducts,
  getFeaturedProducts,
  getProduct,
  getUploadURL,
  updateProduct,
  deleteProduct,
};
