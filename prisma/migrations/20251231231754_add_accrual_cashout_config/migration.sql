-- AlterTable
ALTER TABLE "leave_settings" ADD COLUMN     "accrual_divisor" INTEGER DEFAULT 365,
ADD COLUMN     "accrual_frequency" VARCHAR(20) DEFAULT 'DAILY',
ADD COLUMN     "annual_leave_base_days" INTEGER DEFAULT 16,
ADD COLUMN     "balance_notification_enabled" BOOLEAN DEFAULT true,
ADD COLUMN     "enable_encashment" BOOLEAN DEFAULT false,
ADD COLUMN     "enable_leave_expiry" BOOLEAN DEFAULT true,
ADD COLUMN     "encashment_rounding" VARCHAR(10) DEFAULT 'ROUND',
ADD COLUMN     "encashment_salary_divisor" INTEGER DEFAULT 30,
ADD COLUMN     "expiry_notification_days" INTEGER DEFAULT 30,
ADD COLUMN     "increment_amount" INTEGER DEFAULT 1,
ADD COLUMN     "increment_period_years" INTEGER DEFAULT 2,
ADD COLUMN     "max_annual_leave_cap" INTEGER,
ADD COLUMN     "max_encashment_days" INTEGER,
ADD COLUMN     "notification_channels" VARCHAR(100) DEFAULT 'EMAIL',
ADD COLUMN     "policy_effective_date" DATE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "policy_version" INTEGER DEFAULT 1;

-- CreateTable
CREATE TABLE "accrual_logs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "accrual_date" DATE NOT NULL,
    "days_accrued" DECIMAL(6,4) NOT NULL,
    "cumulative_accrued" DECIMAL(6,2) NOT NULL,
    "annual_entitlement" INTEGER NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accrual_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_cash_outs" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "days_cashed_out" DECIMAL(5,2) NOT NULL,
    "cash_value" DECIMAL(12,2) NOT NULL,
    "monthly_salary" DECIMAL(12,2) NOT NULL,
    "salary_divisor" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "approved_by" VARCHAR(20),
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_cash_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_accrual_log_employee_type_year" ON "accrual_logs"("employee_id", "leave_type_id", "fiscal_year");

-- CreateIndex
CREATE INDEX "idx_accrual_log_date" ON "accrual_logs"("accrual_date");

-- CreateIndex
CREATE INDEX "idx_cash_out_employee_year" ON "leave_cash_outs"("employee_id", "fiscal_year");

-- AddForeignKey
ALTER TABLE "accrual_logs" ADD CONSTRAINT "accrual_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "leave_settings"("company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_cash_outs" ADD CONSTRAINT "leave_cash_outs_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_cash_outs" ADD CONSTRAINT "leave_cash_outs_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
