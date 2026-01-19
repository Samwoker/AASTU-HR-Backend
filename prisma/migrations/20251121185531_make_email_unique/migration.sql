-- CreateEnum
CREATE TYPE "InstitutionCategory" AS ENUM ('Government', 'Private');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('Regular', 'Extension', 'Weekend', 'Distance');

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "company_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "logo_url" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_title" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "level" VARCHAR(50),

    CONSTRAINT "job_title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "gender" VARCHAR(10),
    "date_of_birth" DATE,
    "tin_number" VARCHAR(20),
    "pension_number" VARCHAR(20),
    "place_of_work" VARCHAR(100) DEFAULT 'Head Office',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_address" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20),
    "address_type" VARCHAR(20) DEFAULT 'Current',
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "sub_city" VARCHAR(100),
    "woreda" VARCHAR(50),

    CONSTRAINT "employee_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_phone" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20),
    "phone_number" VARCHAR(20) NOT NULL,
    "phone_type" VARCHAR(20) DEFAULT 'Private',
    "is_primary" BOOLEAN DEFAULT false,

    CONSTRAINT "employee_phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "manager_id" VARCHAR(20),
    "department_id" INTEGER,
    "job_title_id" INTEGER,
    "employment_type" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "gross_salary" DECIMAL(12,2),
    "cost_sharing_status" VARCHAR(20),
    "cost_sharing_amount" DECIMAL(12,2),
    "provider_company" VARCHAR(150),
    "contract_reference" VARCHAR(100),
    "probation_end_date" DATE,
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowance_type" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_taxable" BOOLEAN DEFAULT true,

    CONSTRAINT "allowance_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_allowance" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER,
    "allowance_type_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'ETB',
    "effective_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "employee_allowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_history" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "previous_company_name" VARCHAR(150) NOT NULL,
    "job_title_id" INTEGER,
    "previous_job_title_text" VARCHAR(150),
    "previous_level" VARCHAR(50),
    "department_name" VARCHAR(100),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_internal" BOOLEAN DEFAULT false,
    "is_verified" BOOLEAN DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "separation_reason" (
    "id" SERIAL NOT NULL,
    "reason_category" VARCHAR(50) NOT NULL,
    "reason_detail" VARCHAR(150) NOT NULL,
    "requires_exit_interview" BOOLEAN DEFAULT true,

    CONSTRAINT "separation_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_resignation" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER,
    "employee_id" VARCHAR(20),
    "resignation_date" DATE NOT NULL,
    "last_working_date" DATE,
    "reason_id" INTEGER,
    "new_company" VARCHAR(150),
    "resigned_salary" DECIMAL(12,2),
    "termination_status" VARCHAR(50),
    "termination_payment" DECIMAL(12,2),
    "claims" TEXT,
    "employment_type_at_resignation" VARCHAR(20),
    "position_level_at_resignation" VARCHAR(20),
    "notes" TEXT,
    "recorded_by" VARCHAR(20),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_resignation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_career_event" (
    "id" SERIAL NOT NULL,
    "previous_employment_id" INTEGER,
    "new_employment_id" INTEGER,
    "employee_id" VARCHAR(20),
    "event_date" DATE NOT NULL,
    "effective_date" DATE NOT NULL,
    "previous_job_title_id" INTEGER,
    "new_job_title_id" INTEGER,
    "previous_salary" DECIMAL(12,2),
    "new_salary" DECIMAL(12,2),
    "event_type" VARCHAR(50) NOT NULL,
    "justification" TEXT,
    "approved_by" VARCHAR(20),
    "recorded_by" VARCHAR(20),
    "department_changed" BOOLEAN DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_career_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_level" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_order" INTEGER DEFAULT 0,

    CONSTRAINT "education_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_of_study" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "field_of_study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "InstitutionCategory" NOT NULL,
    "is_verified" BOOLEAN DEFAULT false,

    CONSTRAINT "institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_education" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20),
    "education_level_id" INTEGER,
    "field_of_study_id" INTEGER,
    "institution_id" INTEGER,
    "program_type" "ProgramType" NOT NULL,
    "has_cost_sharing" BOOLEAN,
    "start_date" DATE,
    "end_date" DATE,
    "is_verified" BOOLEAN DEFAULT false,
    "is_current" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_licenses_and_certifications" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20),
    "name" VARCHAR(150) NOT NULL,
    "issuing_organization" VARCHAR(150),
    "issue_date" DATE,
    "expiration_date" DATE,
    "credential_id" VARCHAR(100),
    "credential_url" VARCHAR(255),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_licenses_and_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_role" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "app_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20),
    "email" VARCHAR(150) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_resource" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,

    CONSTRAINT "app_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_permission" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_read" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "app_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_role_job_title" (
    "company_id" INTEGER NOT NULL,
    "job_title_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "app_role_job_title_pkey" PRIMARY KEY ("job_title_id","company_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_company_code_key" ON "company"("company_code");

-- CreateIndex
CREATE INDEX "idx_dept_company" ON "department"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_company_id_name_key" ON "department"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ux_department_id_company" ON "department"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_jobtitle_company" ON "job_title"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_title_company_id_title_level_key" ON "job_title"("company_id", "title", "level");

-- CreateIndex
CREATE UNIQUE INDEX "ux_job_title_id_company" ON "job_title"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_tin_number_key" ON "employee"("tin_number");

-- CreateIndex
CREATE INDEX "idx_employee_company" ON "employee"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_employee_id_company" ON "employee"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_employment_company" ON "employment"("company_id");

-- CreateIndex
CREATE INDEX "idx_employment_employee" ON "employment"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employment_manager" ON "employment"("manager_id");

-- CreateIndex
CREATE INDEX "idx_employment_department" ON "employment"("department_id");

-- CreateIndex
CREATE INDEX "idx_employment_job_title" ON "employment"("job_title_id");

-- CreateIndex
CREATE UNIQUE INDEX "allowance_type_name_key" ON "allowance_type"("name");

-- CreateIndex
CREATE INDEX "idx_emp_allowance_employment" ON "employee_allowance"("employment_id");

-- CreateIndex
CREATE INDEX "idx_emp_allowance_type" ON "employee_allowance"("allowance_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "education_level_name_key" ON "education_level"("name");

-- CreateIndex
CREATE UNIQUE INDEX "field_of_study_name_key" ON "field_of_study"("name");

-- CreateIndex
CREATE UNIQUE INDEX "institution_name_key" ON "institution"("name");

-- CreateIndex
CREATE INDEX "idx_emp_edu_employee" ON "employee_education"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_role_company_id_name_key" ON "app_role"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ux_app_role_id_company" ON "app_role"("id", "company_id");

-- CreateIndex
CREATE INDEX "idx_app_user_company" ON "app_user"("company_id");

-- CreateIndex
CREATE INDEX "idx_app_user_role" ON "app_user"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_resource_code_key" ON "app_resource"("code");

-- CreateIndex
CREATE INDEX "idx_app_permission_role" ON "app_permission"("role_id");

-- CreateIndex
CREATE INDEX "idx_app_permission_resource" ON "app_permission"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_permission_role_id_resource_id_key" ON "app_permission"("role_id", "resource_id");

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_title" ADD CONSTRAINT "job_title_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_address" ADD CONSTRAINT "employee_address_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_phone" ADD CONSTRAINT "employee_phone_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_title"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_allowance" ADD CONSTRAINT "employee_allowance_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_allowance" ADD CONSTRAINT "employee_allowance_allowance_type_id_fkey" FOREIGN KEY ("allowance_type_id") REFERENCES "allowance_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_title"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_resignation" ADD CONSTRAINT "employee_resignation_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_resignation" ADD CONSTRAINT "employee_resignation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_resignation" ADD CONSTRAINT "employee_resignation_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "separation_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_resignation" ADD CONSTRAINT "employee_resignation_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_previous_employment_id_fkey" FOREIGN KEY ("previous_employment_id") REFERENCES "employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_new_employment_id_fkey" FOREIGN KEY ("new_employment_id") REFERENCES "employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_previous_job_title_id_fkey" FOREIGN KEY ("previous_job_title_id") REFERENCES "job_title"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_new_job_title_id_fkey" FOREIGN KEY ("new_job_title_id") REFERENCES "job_title"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_career_event" ADD CONSTRAINT "employee_career_event_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "education_level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_field_of_study_id_fkey" FOREIGN KEY ("field_of_study_id") REFERENCES "field_of_study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_licenses_and_certifications" ADD CONSTRAINT "employee_licenses_and_certifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_role" ADD CONSTRAINT "app_role_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_permission" ADD CONSTRAINT "app_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_permission" ADD CONSTRAINT "app_permission_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "app_resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_role_job_title" ADD CONSTRAINT "app_role_job_title_job_title_id_company_id_fkey" FOREIGN KEY ("job_title_id", "company_id") REFERENCES "job_title"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_role_job_title" ADD CONSTRAINT "app_role_job_title_role_id_company_id_fkey" FOREIGN KEY ("role_id", "company_id") REFERENCES "app_role"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;
