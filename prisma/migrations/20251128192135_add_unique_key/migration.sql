/*
  Warnings:

  - A unique constraint covering the columns `[company_id,employee_id]` on the table `app_user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "app_user_company_id_employee_id_key" ON "app_user"("company_id", "employee_id");
