const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

const prisma = new PrismaClient();

// Read the products data
const productsData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../ecommerce/data/data.json'),
    'utf-8'
  )
);

// Helper function to upload image to Cloudinary
async function uploadImageToCloudinary(imagePath) {
  try {
    // Convert relative path to absolute path
    const fullImagePath = path.join(__dirname, '../../ecommerce/public', imagePath);

    // Check if file exists
    if (!fs.existsSync(fullImagePath)) {
      console.log(`⚠️  Image not found: ${fullImagePath}`);
      return null;
    }

    // Read image file as buffer
    const imageBuffer = fs.readFileSync(fullImagePath);

    // Upload to Cloudinary (assuming images folder)
    const cloudinaryUrl = await uploadToCloudinary(imageBuffer, 'image', 'products');

    return cloudinaryUrl;
  } catch (error) {
    console.error(`Error uploading image ${imagePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🌱 Starting seed...');

  // First, create categories
  console.log('📁 Creating categories...');
  const categories = ['men', 'women', 'children'];

  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
    console.log(`✅ Category created/updated: ${categoryName}`);
  }

  // Get category IDs
  const menCategory = await prisma.category.findUnique({ where: { name: 'men' } });
  const womenCategory = await prisma.category.findUnique({ where: { name: 'women' } });
  const childrenCategory = await prisma.category.findUnique({ where: { name: 'children' } });

  const categoryMap = {
    men: menCategory.id,
    women: womenCategory.id,
    children: childrenCategory.id,
  };

  // Add products
  console.log('\n📦 Adding products...');
  let successCount = 0;
  let errorCount = 0;

  for (const product of productsData.products) {
    try {
      const categoryId = categoryMap[product.category];

      if (!categoryId) {
        console.log(`❌ Skipping product ${product.id}: Unknown category ${product.category}`);
        errorCount++;
        continue;
      }

      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: { name: product.name }
      });

      if (existingProduct) {
        console.log(`⏭️  Product already exists: ${product.name}`);
        continue;
      }

      // Upload image to Cloudinary
      console.log(`📤 Uploading image for: ${product.name}...`);
      const cloudinaryImageUrl = await uploadImageToCloudinary(product.image);

      if (!cloudinaryImageUrl) {
        console.log(`⚠️  Skipping product ${product.name}: Image upload failed`);
        errorCount++;
        continue;
      }

      // Create product
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          sizes: product.sizes,
          defaultSize: product.defaultSize,
          colors: product.colors,
          defaultColor: product.defaultColor,
          bestSeller: product.bestSeller,
          newArrival: product.newArrival || false,
          image: cloudinaryImageUrl, // Store the Cloudinary URL
          subcategory: product.subcategory,
          rating: product.rating,
          discount: product.discount,
          tags: product.tags,
          categoryId: categoryId,
        },
      });

      successCount++;
      console.log(`✅ Added product: ${product.name}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error adding product ${product.name}:`, error.message);
    }
  }

  console.log(`\n✨ Seeding complete!`);
  console.log(`✅ Successfully added: ${successCount} products`);
  console.log(`❌ Errors: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
