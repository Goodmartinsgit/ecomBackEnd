const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateAllOrdersToPending() {
  try {
    console.log("Starting order status update...");
    
    // Update all orders to PENDING status
    const result = await prisma.order.updateMany({
      where: {
        status: {
          in: ['COMPLETED', 'DELIVERED', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
        }
      },
      data: {
        status: 'PENDING'
      }
    });
    
    console.log(`Updated ${result.count} orders to PENDING status`);
    
    // Update all receipts to "Order Placed" status
    const receiptResult = await prisma.receipt.updateMany({
      where: {
        status: 'COMPLETED'
      },
      data: {
        status: 'Order Placed'
      }
    });
    
    console.log(`Updated ${receiptResult.count} receipts to "Order Placed" status`);
    
    console.log("Order status update completed successfully!");
    
  } catch (error) {
    console.error("Error updating order status:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllOrdersToPending();