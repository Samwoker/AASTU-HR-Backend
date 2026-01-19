-- CreateTable
CREATE TABLE "employee_document" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "cv" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceLetters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "taxForms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pensionForms" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "employee_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_document_employee_id_company_id_key" ON "employee_document"("employee_id", "company_id");

-- AddForeignKey
ALTER TABLE "employee_document" ADD CONSTRAINT "employee_document_employee_id_company_id_fkey" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employee"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;
