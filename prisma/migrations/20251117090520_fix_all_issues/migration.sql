/*
  Warnings:

  - You are about to alter the column `price` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `rating` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(3,2)`.
  - You are about to alter the column `discount` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "ProductCart" ALTER COLUMN "quantity" SET DEFAULT 1;
