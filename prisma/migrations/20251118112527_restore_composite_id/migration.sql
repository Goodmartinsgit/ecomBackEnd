/*
  Warnings:

  - The primary key for the `ProductCart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ProductCart` table. All the data in the column will be lost.
  - Made the column `cartId` on table `ProductCart` required. This step will fail if there are existing NULL values in that column.
  - Made the column `productId` on table `ProductCart` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProductCart" DROP CONSTRAINT "ProductCart_pkey",
DROP COLUMN "id",
ALTER COLUMN "cartId" SET NOT NULL,
ALTER COLUMN "productId" SET NOT NULL,
ADD CONSTRAINT "ProductCart_pkey" PRIMARY KEY ("productId", "cartId");

-- CreateIndex
CREATE INDEX "ProductCart_cartId_idx" ON "ProductCart"("cartId");
