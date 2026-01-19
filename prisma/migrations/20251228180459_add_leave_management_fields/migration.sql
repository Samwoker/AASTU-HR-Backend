-- AlterTable
ALTER TABLE "leave_balances" ALTER COLUMN "remaining_days" DROP NOT NULL;

-- AlterTable
ALTER TABLE "leave_types" ADD COLUMN     "incremental_period_years" INTEGER DEFAULT 1,
ADD COLUMN     "is_calendar_days" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "unpaid_leave_usage" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unpaid_leave_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_unpaid_leave_usage_employee" ON "unpaid_leave_usage"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "unpaid_leave_usage_employee_id_company_id_fiscal_year_key" ON "unpaid_leave_usage"("employee_id", "company_id", "fiscal_year");
