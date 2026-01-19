import { Request, Response, NextFunction } from "express";
import prisma from "src/prisma";


export const replaceEmployeeDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.company_id;
    if (!companyId) return res.status(400).json({ status: "fail", message: "Company ID missing" });

    const { documents } = req.body;

    await prisma.$transaction(async (tx) => {
      // 1. Get explicit documents list
      let finalDocs = documents || [];
      if (!Array.isArray(finalDocs)) finalDocs = [];
      else finalDocs = [...finalDocs];

      // 2. Scan for stray document objects in body
      const excludedKeys = new Set(['documents', 'user', 'company', 'company_id']);
      // Add common non-doc fields to exclude if this endpoint receives mixed content (unlikely for a specific doc endpoint, but safe)

      const potentialIdKeys = ['idDocument', 'id_document', 'passport', 'passport_document', 'idCard', 'id_card', 'national_id', 'nationalId'];

      for (const [key, value] of Object.entries(req.body)) {
        if (excludedKeys.has(key)) continue;

        const isKnownIdKey = potentialIdKeys.includes(key);

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const valObj = value as any;
          const hasUrl = valObj.url || valObj.document_url;

          if (hasUrl || isKnownIdKey) {
            const url = valObj.url || valObj.document_url;
            if (url && typeof url === 'string') {
              // Avoid duplicates
              if (!finalDocs.some((d: any) => (d.url === url || d.document_url === url))) {
                finalDocs.push({
                  type: valObj.type || valObj.document_type || "ID/Passport",
                  url: url,
                  fileName: valObj.name || valObj.fileName || valObj.file_name || key
                });
              }
            }
          }
        }
      }

      // 3. Update if we have any documents (explicit or found) OR if explicit empty list was sent (to clear)
      // If req.body.documents was undefined, and no stray found, we do nothing? 
      // Or if req.body.documents is undefined, we assume partial update? 
      // Usually replace... implies we should process if *anything* relevant is present. 
      // If documents is passed (even empty), we process.
      // If stray files found, we process.

      const shouldProcess = (documents && Array.isArray(documents)) || finalDocs.length > 0;

      if (shouldProcess) {
        // Delete existing documents (except profile pics if stored here, assuming they are filtered out)
        await tx.employeeDocument.deleteMany({ where: { employee_id: id } });

        const validDocs = finalDocs.filter((d: any) => d.type !== 'PHOTO' && (d.url || d.document_url));
        if (validDocs.length > 0) {
          await tx.employeeDocument.createMany({
            data: validDocs.map((doc: any) => ({
              employee_id: id,
              document_type: doc.type || "Other",
              document_url: doc.url || doc.document_url,
              file_name: doc.name || doc.fileName || doc.file_name
            }))
          });
        }
      }
    });

    res.status(200).json({ status: "success", message: "Documents updated" });
  } catch (error) {
    next(error);
  }
};


