const { prisma } = require('../config/database');
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const { sanitize, validateRequired, parseId, parsePositiveFloat, validateProductUpdate } = require('../utils/validation');

const { AppError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');

exports.createProduct = catchAsync(async (req, res, next) => {
  let {
    name,
    description,
    price,
    currency,
    sizes,
    defaultSize,
    colors,
    defaultColor,
    bestSeller,
    subcategory,
    rating,
    discount,
    newArrival,
    tags,
    stock,
    categoryId,
  } = req.body;

  name = sanitize(name);
  description = sanitize(description);
  currency = sanitize(currency);
  defaultSize = sanitize(defaultSize);
  defaultColor = sanitize(defaultColor);
  subcategory = sanitize(subcategory);

  validateRequired(name, 'Name');
  validateRequired(description, 'Description');
  validateRequired(price, 'Price');
  validateRequired(currency, 'Currency');
  validateRequired(sizes, 'Sizes');
  validateRequired(defaultSize, 'Default size');
  validateRequired(colors, 'Colors');
  validateRequired(defaultColor, 'Default color');
  validateRequired(subcategory, 'Subcategory');
  validateRequired(categoryId, 'Category ID');

  const parsedPrice = parsePositiveFloat(price, 'Price');
  const parsedRating = rating ? parsePositiveFloat(rating, 'Rating') : 0;
  const parsedDiscount = discount ? parseFloat(discount) : 0;
  const parsedCategoryId = parseId(categoryId, 'Category ID');

  const categoryExists = await prisma.category.findUnique({
    where: { id: parsedCategoryId },
  });

  if (!categoryExists) {
    const availableCategories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    throw new AppError(`Category with ID ${parsedCategoryId} does not exist`, 400, 'CATEGORY_NOT_FOUND').setData({ availableCategories });
  }

  let parsedSizes = Array.isArray(sizes) ? sizes : JSON.parse(sizes);
  let parsedColors = Array.isArray(colors) ? colors : JSON.parse(colors);
  let parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

  const existingProduct = await prisma.product.findFirst({
    where: { name },
  });

  if (existingProduct) {
    throw new AppError('Product already exists', 400, 'PRODUCT_EXISTS');
  }

  let imageUrl = null;
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file.buffer, "image", "Product");
  }

  if (!imageUrl) {
    imageUrl = "";
  }

  const parsedStock = stock ? parseInt(stock) : 0;

  const newProduct = await prisma.product.create({
    data: {
      name,
      description,
      price: parsedPrice,
      currency,
      sizes: parsedSizes,
      defaultSize,
      colors: parsedColors,
      defaultColor,
      bestSeller: bestSeller === true || bestSeller === "true",
      newArrival: newArrival === true || newArrival === "true",
      subcategory,
      rating: parsedRating,
      discount: parsedDiscount,
      tags: parsedTags,
      stock: parsedStock,
      categoryId: parsedCategoryId,
      image: imageUrl,
    },
  });

  logger.info('Product created', { productId: newProduct.id, name: newProduct.name });

  return res.status(201).json({
    success: true,
    message: "Product created successfully!",
    data: newProduct,
  });
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const allProducts = await prisma.product.findMany({
    include: {
      category: true
    }
  });

  res.status(200).json({
    success: true,
    message: "Products retrieved successfully",
    data: allProducts,
  });
});

exports.getSingleProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const parsedId = parseId(id, 'Product ID');
  
  const product = await prisma.product.findUnique({
    where: { id: parsedId },
  });
  
  if (!product) {
    throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }
  
  res.status(200).json({
    success: true,
    message: "Product retrieved successfully",
    data: product,
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const { id, updateData } = req.validatedData;

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });
  
  if (!existingProduct) {
    throw new AppError('Product does not exist', 404, 'PRODUCT_NOT_FOUND');
  }

  if (updateData.categoryId) {
    const categoryExists = await prisma.category.findUnique({
      where: { id: updateData.categoryId },
    });
    if (!categoryExists) {
      throw new AppError(`Category with ID ${updateData.categoryId} does not exist`, 400, 'CATEGORY_NOT_FOUND');
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  logger.info('Product updated', { productId: updatedProduct.id });

  return res.status(200).json({
    success: true,
    message: "Product updated successfully!",
    data: updatedProduct,
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  
  validateRequired(id, 'Product ID');
  const parsedId = parseId(id, 'Product ID');
  
  const existingProduct = await prisma.product.findUnique({
    where: { id: parsedId },
  });
  
  if (!existingProduct) {
    throw new AppError('Product does not exist', 404, 'PRODUCT_NOT_FOUND');
  }
  
  const deletedProduct = await prisma.product.delete({
    where: { id: parsedId },
  });
  
  logger.info('Product deleted', { productId: parsedId });
  
  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
    data: deletedProduct,
  });
});
