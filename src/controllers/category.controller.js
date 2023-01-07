const { query } = require('../configs/db.config');
const BadRequestError = require('../errors/bad-request-error');
const s3 = require('../configs/aws.config');

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
    Key: 'categories/' + filename,
    ContentType: fileType,
    Expires: 60 * 5,
  });

  console.log('Upload URL generated successfully...');
  res.status(200).send({ url });
};

const createCategory = async (req, res) => {
  const { name, isActive, image } = req.body;

  // Check if category with same name exists
  const cleanName = name.trim();

  const categories = await query('SELECT * FROM categories WHERE name = ?', [
    cleanName,
  ]);

  if (categories.length > 0) {
    throw new BadRequestError('Category already exists!');
  }

  try {
    const newCategory = await query(
      'INSERT INTO categories (name, isActive, image) VALUES (?, ?, ?)',
      [cleanName, isActive ? isActive : true, image]
    );

    console.log('Category created successfully...');

    res.status(201).send({ message: 'Category created successfully' });
  } catch (err) {
    console.log('Error while create category: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories');

    console.log(`Found categories: ${categories.length}`);
    res.status(200).send({ categories });
  } catch (err) {
    console.log('Error while get categories: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const getCategory = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Category not found!');
  }

  try {
    const result = await query('SELECT * FROM categories WHERE id = ?', [id]);

    if (result.length === 0) {
      throw new BadRequestError(`Category doesn't exist`);
    }

    let category = result[0];

    category = {
      ...category,
      imageUrl: await s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: 'categories/' + category.image,
      }),
    };

    console.log(`Category found: ${category.name}`);

    res.status(200).send({ category });
  } catch (err) {
    console.log('Error while get category: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const updateCategory = async (req, res) => {
  const { id, name, isActive, oldImage, image } = req.body;

  const category = await query('SELECT * FROM categories WHERE id = ?', [id]);

  if (category.length === 0) {
    throw new BadRequestError(`Category doesn't exist`);
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
    const result = await query('UPDATE categories SET ? WHERE id = ?', [
      { name, isActive, image },
      id,
    ]);

    console.log(`Category updated successfully... ${result}`);
    res.status(200).send({ message: 'Category updated successfully' });
  } catch (err) {
    console.log('Error while update category: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.body;

  // Check if category exists
  const category = await query('SELECT * FROM categories WHERE id = ?', [id]);

  if (category.length === 0) {
    throw new BadRequestError(`Category doesn't exist`);
  }

  const products = await query('SELECT * FROM products WHERE category_id = ?', [
    id,
  ]);

  if (products.length > 0) {
    throw new BadRequestError(
      `Cannot delete category while ${products.length} products are still in this category.`
    );
  }

  // delete the image from the s3 bucket
  const categoryImage = category[0].image;
  await s3
    .deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: 'categories/' + categoryImage,
    })
    .promise();

  try {
    const result = await query('DELETE FROM categories WHERE id =? ', [id]);

    console.log('Category deleted...');

    res.status(200).send({ message: 'Category deleted successfully' });
  } catch (err) {
    console.log('Error while deleting category: ', err);
    throw new BadRequestError('Something went wrong');
  }
};

module.exports = {
  getUploadURL,
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
