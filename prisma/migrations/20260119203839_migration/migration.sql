/*
  Warnings:

  - You are about to drop the column `housing_allowance` on the `employment` table. All the data in the column will be lost.
  - You are about to drop the column `meal_allowance` on the `employment` table. All the data in the column will be lost.
  - You are about to drop the column `transportation_allowance` on the `employment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CostSharingCommitmentType" AS ENUM ('Full_Study', 'Partial_Study', 'Service_Obligation');

-- CreateEnum
CREATE TYPE "CostSharingStatus" AS ENUM ('DECLARED', 'VERIFIED', 'REJECTED', 'CLEARED');

-- AlterTable
ALTER TABLE "employee_education" ADD COLUMN     "cost_sharing_details" TEXT,
ADD COLUMN     "document_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "employment" DROP COLUMN "housing_allowance",
DROP COLUMN "meal_allowance",
DROP COLUMN "transportation_allowance";

-- AlterTable
ALTER TABLE "employment_history" ADD COLUMN     "document_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "leave_types" ALTER COLUMN "incremental_period_years" SET DEFAULT 2;

-- CreateTable
CREATE TABLE "employee_cost_sharing" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "education_id" INTEGER,
    "document_number" VARCHAR(100),
    "issuing_institution" VARCHAR(200),
    "issue_date" DATE,
    "program_type" "ProgramType",
    "department" VARCHAR(150),
    "year_of_entrance" INTEGER,
    "graduation_date" DATE,
    "declared_total_cost" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "commitment_type" "CostSharingCommitmentType",
    "regulation_reference" VARCHAR(150),
    "status" "CostSharingStatus" NOT NULL DEFAULT 'DECLARED',
    "document_url" VARCHAR(255),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_cost_sharing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_cost_sharing_employee_id_idx" ON "employee_cost_sharing"("employee_id");

-- CreateIndex
CREATE INDEX "employee_cost_sharing_status_idx" ON "employee_cost_sharing"("status");

-- CreateIndex
CREATE INDEX "employee_cost_sharing_education_id_idx" ON "employee_cost_sharing"("education_id");

-- AddForeignKey
ALTER TABLE "employee_cost_sharing" ADD CONSTRAINT "employee_cost_sharing_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "employee_education"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_cost_sharing" ADD CONSTRAINT "employee_cost_sharing_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
