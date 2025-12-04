/*
  Warnings:

  - You are about to drop the column `userid` on the `Cart` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `price` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to drop the column `cartid` on the `ProductCart` table. All the data in the column will be lost.
  - You are about to drop the column `productid` on the `ProductCart` table. All the data in the column will be lost.
  - You are about to drop the column `selectedcolor` on the `ProductCart` table. All the data in the column will be lost.
  - You are about to drop the column `selectedsize` on the `ProductCart` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "public"."Cart" DROP CONSTRAINT "Cart_userid_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductCart" DROP CONSTRAINT "ProductCart_cartid_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductCart" DROP CONSTRAINT "ProductCart_productid_fkey";

-- DropIndex
DROP INDEX "public"."Cart_userid_key";

-- DropIndex
DROP INDEX "public"."ProductCart_productid_cartid_key";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "userid",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductCart" DROP COLUMN "cartid",
DROP COLUMN "productid",
DROP COLUMN "selectedcolor",
DROP COLUMN "selectedsize",
ADD COLUMN     "cartId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "productId" INTEGER,
ADD COLUMN     "selectedColor" TEXT,
ADD COLUMN     "selectedSize" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD CONSTRAINT "ProductCart_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Receipt" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" SERIAL NOT NULL,
    "receiptId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_email_key" ON "Receipt"("email");

-- CreateIndex
CREATE INDEX "Receipt_userId_idx" ON "Receipt"("userId");

-- CreateIndex
CREATE INDEX "Receipt_orderId_idx" ON "Receipt"("orderId");

-- CreateIndex
CREATE INDEX "ReceiptItem_receiptId_idx" ON "ReceiptItem"("receiptId");

-- CreateIndex
CREATE INDEX "ReceiptItem_productId_idx" ON "ReceiptItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderId_idx" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_bestSeller_idx" ON "Product"("bestSeller");

-- CreateIndex
CREATE INDEX "Product_newArrival_idx" ON "Product"("newArrival");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCart" ADD CONSTRAINT "ProductCart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCart" ADD CONSTRAINT "ProductCart_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
