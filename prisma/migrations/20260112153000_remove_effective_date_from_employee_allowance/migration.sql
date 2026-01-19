-- Remove effective_date from employee_allowance.
-- This fixes createMany() failures when the column is NOT NULL in DB but not present in the Prisma model.

ALTER TABLE "employee_allowance" DROP COLUMN IF EXISTS "effective_date";
