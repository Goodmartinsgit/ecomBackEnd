/*
  Warnings:

  - Changed the type of `userId` on the `Receipt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_userId_key" ON "Receipt"("userId");

-- CreateIndex
CREATE INDEX "Receipt_userId_idx" ON "Receipt"("userId");
