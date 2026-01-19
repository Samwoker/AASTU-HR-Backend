-- CreateTable
CREATE TABLE "leave_types" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "default_allowance_days" INTEGER NOT NULL,
    "incremental_days_per_year" INTEGER DEFAULT 0,
    "max_accrual_limit" INTEGER,
    "is_carry_over_allowed" BOOLEAN DEFAULT false,
    "carry_over_expiry_months" INTEGER,
    "applicable_gender" VARCHAR(10) DEFAULT 'All',
    "requires_attachment" BOOLEAN DEFAULT false,
    "is_paid" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "holiday_date" DATE NOT NULL,
    "is_recurring" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "total_entitlement" DECIMAL(5,2) NOT NULL,
    "used_days" DECIMAL(5,2) DEFAULT 0,
    "pending_days" DECIMAL(5,2) DEFAULT 0,
    "remaining_days" DECIMAL(5,2) NOT NULL,
    "expiry_date" DATE,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_applications" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "return_date" DATE NOT NULL,
    "requested_days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "attachment_url" TEXT,
    "relief_officer_id" VARCHAR(20),
    "relief_company_id" INTEGER,
    "current_status" VARCHAR(50) DEFAULT 'PENDING_SUPERVISOR',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_logs" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "approver_id" VARCHAR(20) NOT NULL,
    "approver_company_id" INTEGER NOT NULL,
    "approver_role" VARCHAR(50) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "comments" TEXT,
    "action_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_recalls" (
    "id" SERIAL NOT NULL,
    "leave_application_id" INTEGER NOT NULL,
    "recalled_by" VARCHAR(20) NOT NULL,
    "recalled_by_company_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "recall_date" DATE NOT NULL,
    "actual_return_date" DATE,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "employee_response" TEXT,
    "responded_at" TIMESTAMP(3),
    "days_restored" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_recalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_settings" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "saturday_half_day" BOOLEAN DEFAULT true,
    "sunday_off" BOOLEAN DEFAULT true,
    "fiscal_year_start_month" INTEGER DEFAULT 1,
    "accrual_basis" VARCHAR(20) DEFAULT 'ANNIVERSARY',
    "require_ceo_approval_for_managers" BOOLEAN DEFAULT true,
    "auto_approve_after_days" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_leave_types_company" ON "leave_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_company_id_code_key" ON "leave_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "idx_public_holidays_company" ON "public_holidays"("company_id");

-- CreateIndex
CREATE INDEX "idx_public_holidays_date" ON "public_holidays"("holiday_date");

-- CreateIndex
CREATE INDEX "idx_leave_balances_employee" ON "leave_balances"("employee_id");

-- CreateIndex
CREATE INDEX "idx_leave_balances_company" ON "leave_balances"("company_id");

-- CreateIndex
CREATE INDEX "idx_leave_balances_leave_type" ON "leave_balances"("leave_type_id");

-- CreateIndex
CREATE INDEX "idx_leave_balances_fiscal_year" ON "leave_balances"("fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_leave_type_id_fiscal_year_key" ON "leave_balances"("employee_id", "leave_type_id", "fiscal_year");

-- CreateIndex
CREATE INDEX "idx_leave_applications_employee" ON "leave_applications"("employee_id");

-- CreateIndex
CREATE INDEX "idx_leave_applications_company" ON "leave_applications"("company_id");

-- CreateIndex
CREATE INDEX "idx_leave_applications_leave_type" ON "leave_applications"("leave_type_id");

-- CreateIndex
CREATE INDEX "idx_leave_applications_status" ON "leave_applications"("current_status");

-- CreateIndex
CREATE INDEX "idx_leave_applications_dates" ON "leave_applications"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_leave_approval_logs_application" ON "leave_approval_logs"("application_id");

-- CreateIndex
CREATE INDEX "idx_leave_approval_logs_approver" ON "leave_approval_logs"("approver_id");

-- CreateIndex
CREATE INDEX "idx_leave_approval_logs_action_date" ON "leave_approval_logs"("action_date");

-- CreateIndex
CREATE INDEX "idx_leave_recalls_application" ON "leave_recalls"("leave_application_id");

-- CreateIndex
CREATE INDEX "idx_leave_recalls_recalled_by" ON "leave_recalls"("recalled_by");

-- CreateIndex
CREATE INDEX "idx_leave_recalls_status" ON "leave_recalls"("status");

-- CreateIndex
CREATE UNIQUE INDEX "leave_settings_company_id_key" ON "leave_settings"("company_id");

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_holidays" ADD CONSTRAINT "public_holidays_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_relief_officer_id_relief_company_id_fkey" FOREIGN KEY ("relief_officer_id", "relief_company_id") REFERENCES "employee"("id", "company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_logs" ADD CONSTRAINT "leave_approval_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "leave_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_logs" ADD CONSTRAINT "leave_approval_logs_approver_id_approver_company_id_fkey" FOREIGN KEY ("approver_id", "approver_company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_recalls" ADD CONSTRAINT "leave_recalls_leave_application_id_fkey" FOREIGN KEY ("leave_application_id") REFERENCES "leave_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_recalls" ADD CONSTRAINT "leave_recalls_recalled_by_recalled_by_company_id_fkey" FOREIGN KEY ("recalled_by", "recalled_by_company_id") REFERENCES "employee"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_settings" ADD CONSTRAINT "leave_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
