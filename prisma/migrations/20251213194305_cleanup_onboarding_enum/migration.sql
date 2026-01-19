/*
  Warnings:

  - The values [Completed,Pending] on the enum `OnboardingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

-- Normalize existing data to supported values before altering enum
UPDATE "app_user" SET "onboarding_status" = 'COMPLETED' WHERE "onboarding_status" = 'Completed';
UPDATE "app_user" SET "onboarding_status" = 'PENDING' WHERE "onboarding_status" = 'Pending';

CREATE TYPE "OnboardingStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SUBMITTED');
ALTER TABLE "app_user" ALTER COLUMN "onboarding_status" DROP DEFAULT;
ALTER TABLE "app_user" ALTER COLUMN "onboarding_status" TYPE "OnboardingStatus_new" USING ("onboarding_status"::text::"OnboardingStatus_new");
ALTER TYPE "OnboardingStatus" RENAME TO "OnboardingStatus_old";
ALTER TYPE "OnboardingStatus_new" RENAME TO "OnboardingStatus";
DROP TYPE "OnboardingStatus_old";
ALTER TABLE "app_user" ALTER COLUMN "onboarding_status" SET DEFAULT 'PENDING';
COMMIT;
