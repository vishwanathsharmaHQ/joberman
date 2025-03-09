-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aboutEnhancementReason" TEXT,
ADD COLUMN     "educationEnhancementReason" JSONB,
ADD COLUMN     "experienceEnhancementReason" JSONB,
ADD COLUMN     "headlineEnhancementReason" TEXT,
ADD COLUMN     "skillsEnhancementReason" JSONB;
