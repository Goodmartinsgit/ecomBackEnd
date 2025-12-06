const { PrismaClient } = require("@prisma/client");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const prisma = new PrismaClient();

exports.createProduct = async (req, res) => {
  const {
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

  try {
    // Validate required fields
    const requiredFields = {
      name,
      description,
      price,
      currency,
      sizes,
      defaultSize,
      colors,
      defaultColor,
      subcategory,
      categoryId,
    };

    for (let [key, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === "") {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${key}`,
        });
      }
    }

    // Parse and validate numeric fields
    const parsedPrice = parseFloat(price);
    const parsedRating = rating ? parseFloat(rating) : 0;
    const parsedDiscount = discount ? parseFloat(discount) : 0;
    const parsedCategoryId = parseInt(categoryId);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price value",
      });
    }

    if (isNaN(parsedCategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId value",
      });
    }

    // Check if category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!categoryExists) {
      // Get all available categories to help the user
      const availableCategories = await prisma.category.findMany({
        select: { id: true, name: true },
      });

      return res.status(400).json({
        success: false,
        message: `Category with ID ${parsedCategoryId} does not exist`,
        availableCategories,
      });
    }

    // Parse array fields if they're strings
    let parsedSizes = Array.isArray(sizes) ? sizes : JSON.parse(sizes);
    let parsedColors = Array.isArray(colors) ? colors : JSON.parse(colors);
    let parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

    const existingProduct = await prisma.product.findFirst({
      where: { name },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists!",
      });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "image", "Product");
    }

    // Ensure imageUrl is not null for schema requirement
    if (!imageUrl) {
      imageUrl = ""; // or provide a default image URL
    }

    // Parse stock
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

    return res.status(201).json({
      success: true,
      message: "Product created successfully!",
      data: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, please try again later!",
      error: error.message,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error, please try again later!",
    });
  }
};

exports.getSingleProduct = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required!" });
    }
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID!" });
    }
    const product = await prisma.product.findUnique({
      where: { id: parsedId },
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found!" });
    }
    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error, please try again later!",
    });
  }
};

exports.updateProduct = async (req, res) => {
  const { id, value } = req.body;
  const parsedId = parseInt(id);

  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id: parsedId },
    });
    if (!existingProduct) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Product does not exist in database!",
        });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parsedId },
      data: { ...value },
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error, please try again later!",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.body;
  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required!",
      });
    }
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID!",
      });
    }
    const existingProduct = await prisma.product.findUnique({
      where: { id: parsedId },
    });
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product does not exist in database!",
      });
    }
    const deletedProduct = await prisma.product.delete({
      where: { id: parsedId },
    });
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: deletedProduct,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error, please try again later!",
    });
  }
};
