const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance to be shared across the application
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test database connection
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('Database disconnected');
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
