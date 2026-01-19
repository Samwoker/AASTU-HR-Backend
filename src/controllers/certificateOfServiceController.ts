import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { CertificateOfServiceService } from "../services/certificateOfServiceService";

/**
 * Generate a Certificate of Service PDF for an employee
 * 
 * Certificate of Service is a formal, factual document containing:
 * - Employee name
 * - Job title(s) and dates
 * - Salary information
 * - Tax/pension confirmation
 * 
 * Used for: Legal/administrative purposes, proof of employment, HR records
 */
export const generateCertificateOfService = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    // Fetch employee details with full career history
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
      include: {
        employments: {
          include: {
            department: true,
            jobTitle: true,
          },
          orderBy: {
            start_date: "asc",
          },
        },
        careerEvents: {
          include: {
            newJobTitle: true,
            previousJobTitle: true,
            newEmployment: {
              include: {
                department: true,
              },
            },
            previousEmployment: {
              include: {
                department: true,
              },
            },
          },
          orderBy: {
            effective_date: "asc",
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Extract basic fields needed for the certificate
    const activeEmployment = (employee as any).employments.find((e: any) => e.is_active) || (employee as any).employments[0];

    const employeeData = {
      ...employee,
      start_date: activeEmployment?.start_date,
    };

    const pdfBuffer = await CertificateOfServiceService.generate(employeeData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Certificate_of_Service_${employee.full_name.replace(/\s+/g, "_")}.pdf"`,
    );
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[CertificateOfServiceController] Error:", error);
    next(error);
  }
};
