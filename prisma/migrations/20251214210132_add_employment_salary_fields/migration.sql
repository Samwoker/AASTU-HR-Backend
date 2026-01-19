-- AlterTable
ALTER TABLE "employment" ADD COLUMN     "basic_salary" DECIMAL(12,2),
ADD COLUMN     "housing_allowance" DECIMAL(12,2),
ADD COLUMN     "meal_allowance" DECIMAL(12,2),
ADD COLUMN     "transportation_allowance" DECIMAL(12,2);
