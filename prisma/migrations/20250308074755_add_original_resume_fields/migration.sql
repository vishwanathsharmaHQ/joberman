/*
  Warnings:

  - Made the column `enhanced` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "originalAbout" TEXT,
ADD COLUMN     "originalEducation" JSONB,
ADD COLUMN     "originalExperience" JSONB,
ADD COLUMN     "originalHeadline" TEXT,
ADD COLUMN     "originalSkills" JSONB,
ALTER COLUMN "enhanced" SET NOT NULL;
