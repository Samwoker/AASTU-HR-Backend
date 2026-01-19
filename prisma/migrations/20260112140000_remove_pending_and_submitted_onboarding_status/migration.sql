-- Align DB enum values with Prisma schema enum OnboardingStatus
-- Prisma schema enum values: IN_PROGRESS, PENDING_APPROVAL, COMPLETED
-- Older DBs may contain: PENDING, SUBMITTED

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OnboardingStatus'
      AND e.enumlabel IN ('PENDING', 'SUBMITTED')
  ) THEN
    -- Normalize existing rows first so the type cast succeeds
    UPDATE "app_user"
      SET "onboarding_status" = 'IN_PROGRESS'
    WHERE "onboarding_status"::text = 'PENDING';

    UPDATE "app_user"
      SET "onboarding_status" = 'IN_PROGRESS'
    WHERE "onboarding_status"::text = 'SUBMITTED';

    -- Recreate enum without removed values
    CREATE TYPE "OnboardingStatus_new" AS ENUM ('IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED');

    ALTER TABLE "app_user" ALTER COLUMN "onboarding_status" DROP DEFAULT;

    ALTER TABLE "app_user"
      ALTER COLUMN "onboarding_status" TYPE "OnboardingStatus_new"
      USING ("onboarding_status"::text::"OnboardingStatus_new");

    DROP TYPE "OnboardingStatus";
    ALTER TYPE "OnboardingStatus_new" RENAME TO "OnboardingStatus";

    ALTER TABLE "app_user" ALTER COLUMN "onboarding_status" SET DEFAULT 'IN_PROGRESS';
  END IF;
END $$;
