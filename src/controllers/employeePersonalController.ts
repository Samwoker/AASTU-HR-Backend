import { Request, Response, NextFunction } from "express";
import prisma from "src/prisma";
import { sanitizeFileUrl } from "src/services/supabaseService";

export const updatePersonalDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.company_id;

    if (!companyId) {
      return res.status(400).json({ status: "fail", message: "Company ID missing" });
    }

    const {
      full_name,
      gender,
      date_of_birth,
      tin_number,
      pension_number,
      place_of_work,
      profile_picture,
      onboarding_status
    } = req.body;

    // Only include appUsers if we need to update them
    const includeAppUsers = profile_picture !== undefined || onboarding_status !== undefined;

    const existing = await prisma.employee.findUnique({
      where: { id_company_id: { id, company_id: companyId } },
      include: { appUsers: includeAppUsers }
    });

    if (!existing) return res.status(404).json({ status: "fail", message: "Employee not found" });

    // Check TIN uniqueness
    if (tin_number && tin_number !== existing.tin_number) {
      const dup = await prisma.employee.findUnique({ where: { tin_number } });
      if (dup) return res.status(400).json({ status: "fail", message: "TIN already exists" });
    }

    const parsedDob = date_of_birth ? new Date(date_of_birth) : null;

    await prisma.$transaction(async (tx) => {
      // Update Core
      await tx.employee.update({
        where: { id_company_id: { id, company_id: companyId } },
        data: {
          full_name,
          gender,
          date_of_birth: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : undefined,
          tin_number,
          pension_number,
          place_of_work
        }
      });

      // Update AppUser (Profile Pic & Status)
      if (profile_picture !== undefined || onboarding_status) {
        if (existing.appUsers.length > 0) {
          await tx.appUser.updateMany({
            where: { employee_id: id, company_id: companyId },
            data: {
              ...(onboarding_status && { onboarding_status }),
              ...(profile_picture !== undefined && { profile_picture: sanitizeFileUrl(profile_picture) || null })
            }
          });
        }
      }
    });

    res.status(200).json({ status: "success", message: "Personal details updated" });
  } catch (error) {
    next(error);
  }
};
