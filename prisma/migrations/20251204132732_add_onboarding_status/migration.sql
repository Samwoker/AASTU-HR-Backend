-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "employee_address" DROP CONSTRAINT "employee_address_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_allowance" DROP CONSTRAINT "employee_allowance_employment_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_education" DROP CONSTRAINT "employee_education_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_licenses_and_certifications" DROP CONSTRAINT "employee_licenses_and_certifications_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_phone" DROP CONSTRAINT "employee_phone_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_resignation" DROP CONSTRAINT "employee_resignation_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employment" DROP CONSTRAINT "employment_company_id_fkey";

-- DropForeignKey
ALTER TABLE "employment" DROP CONSTRAINT "employment_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employment_history" DROP CONSTRAINT "employment_history_employee_id_fkey";

-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "onboarding_status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "employee_address" ADD COLUMN     "company_id" INTEGER;

-- AlterTable
ALTER TABLE "employee_phone" ADD COLUMN     "company_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_employee_gender" ON "employee"("company_id", "gender");

-- CreateIndex
CREATE INDEX "idx_employee_dob" ON "employee"("company_id", "date_of_birth");

-- CreateIndex
CREATE INDEX "idx_employment_is_active" ON "employment"("is_active");

-- CreateIndex
CREATE INDEX "idx_employment_company_is_active" ON "employment"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_employment_start_date" ON "employment"("company_id", "start_date");

-- CreateIndex
CREATE INDEX "idx_employment_cost_sharing" ON "employment"("company_id", "cost_sharing_status");

-- AddForeignKey
ALTER TABLE "employee_address" ADD CONSTRAINT "employee_address_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_address" ADD CONSTRAINT "employee_address_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_phone" ADD CONSTRAINT "employee_phone_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_phone" ADD CONSTRAINT "employee_phone_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_allowance" ADD CONSTRAINT "employee_allowance_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_resignation" ADD CONSTRAINT "employee_resignation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_licenses_and_certifications" ADD CONSTRAINT "employee_licenses_and_certifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
