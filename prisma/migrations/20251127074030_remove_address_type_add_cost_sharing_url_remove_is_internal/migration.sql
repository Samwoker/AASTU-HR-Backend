/*
  Warnings:

  - You are about to drop the column `can_create` on the `app_permission` table. All the data in the column will be lost.
  - You are about to drop the column `can_delete` on the `app_permission` table. All the data in the column will be lost.
  - You are about to drop the column `can_read` on the `app_permission` table. All the data in the column will be lost.
  - You are about to drop the column `can_update` on the `app_permission` table. All the data in the column will be lost.
  - You are about to drop the column `address_type` on the `employee_address` table. All the data in the column will be lost.
  - You are about to drop the column `is_internal` on the `employment_history` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[role_id,resource_id,action]` on the table `app_permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `app_permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `employment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "app_permission_role_id_resource_id_key";

-- AlterTable
ALTER TABLE "app_permission" DROP COLUMN "can_create",
DROP COLUMN "can_delete",
DROP COLUMN "can_read",
DROP COLUMN "can_update",
ADD COLUMN     "action" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "employee_address" DROP COLUMN "address_type";

-- AlterTable
ALTER TABLE "employee_education" ADD COLUMN     "cost_sharing_document_url" VARCHAR(255);

-- AlterTable
ALTER TABLE "employment" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "employment_history" DROP COLUMN "is_internal";

-- CreateIndex
CREATE UNIQUE INDEX "app_permission_role_id_resource_id_action_key" ON "app_permission"("role_id", "resource_id", "action");
