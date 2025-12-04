/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Receipt` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Receipt_userId_key" ON "Receipt"("userId");
