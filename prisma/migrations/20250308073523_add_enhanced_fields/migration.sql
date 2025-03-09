-- AlterTable
ALTER TABLE "users" ADD COLUMN     "enhanced" BOOLEAN DEFAULT false,
ADD COLUMN     "enhancedAt" TIMESTAMP(3);
