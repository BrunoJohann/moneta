/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ai_provider_configs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ai_provider_configs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_provider_configs" DROP CONSTRAINT "ai_provider_configs_userId_fkey";

-- DropIndex
DROP INDEX "ai_provider_configs_userId_key";

-- AlterTable
ALTER TABLE "ai_provider_configs" DROP COLUMN "createdAt",
DROP COLUMN "userId",
ADD COLUMN     "updatedBy" TEXT;
