import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

export const fetchAllEducations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const employee = await prisma.employee.findUnique({
      where: { id_company_id: { id: employeeId, company_id: companyId } },
    });
    if (!employee)
      return res
        .status(404)
        .json({ status: "fail", message: "Employee not found" });

    const educations = await prisma.employeeEducation.findMany({
      where: { employee_id: employeeId },
      include: { educationLevel: true, fieldOfStudy: true, institution: true },
      orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
    });

    const educationForFrontend = educations.map((e) => ({
      id: e.id,
      level: e.educationLevel?.name ?? null,
      fieldOfStudy: e.fieldOfStudy?.name ?? null,
      institution: e.institution?.name ?? null,
      programType: e.program_type,
      hasCostSharing: e.has_cost_sharing ?? false,
      costSharingDocument: e.cost_sharing_document_url ?? null,
      startDate: e.start_date,
      endDate: e.end_date,
      isCurrent: e.is_current ?? false,
      isVerified: e.is_verified ?? false,
    }));

    res.status(200).json({
      status: "success",
      message: "Education records fetched successfully",
      data: { educations: educationForFrontend, total: educations.length },
    });
  } catch (error) {
    next(error);
  }
};

export const fetchEducation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const education = await prisma.employeeEducation.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: { select: { id: true, full_name: true, company_id: true } },
        educationLevel: true,
        fieldOfStudy: true,
        institution: true,
      },
    });

    if (!education)
      return res
        .status(404)
        .json({ status: "fail", message: "Education record not found" });
    if (education.employee?.company_id !== companyId)
      return res.status(403).json({ status: "fail", message: "Access denied" });

    res.status(200).json({
      status: "success",
      message: "Education record fetched successfully",
      data: {
        education: {
          id: education.id,
          employee_id: education.employee_id,
          level: education.educationLevel?.name ?? null,
          fieldOfStudy: education.fieldOfStudy?.name ?? null,
          institution: education.institution?.name ?? null,
          programType: education.program_type,
          hasCostSharing: education.has_cost_sharing ?? false,
          costSharingDocument: education.cost_sharing_document_url ?? null,
          startDate: education.start_date,
          endDate: education.end_date,
          isCurrent: education.is_current ?? false,
          isVerified: education.is_verified ?? false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createEducation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const {
      employee_id,
      education_level_id,
      field_of_study_id,
      institution_id,
      program_type,
      has_cost_sharing,
      cost_sharing_document_url,
      start_date,
      end_date,
      is_verified,
      is_current,
      cost_sharing_details,
    } = req.body;

    if (!employee_id || !program_type)
      return res.status(400).json({
        status: "fail",
        message: "Please provide employee_id and program_type",
      });

    const employee = await prisma.employee.findUnique({
      where: { id_company_id: { id: employee_id, company_id: companyId } },
    });
    if (!employee)
      return res
        .status(404)
        .json({ status: "fail", message: "Employee not found" });

    const newEducation = await prisma.employeeEducation.create({
      data: {
        employee_id,
        education_level_id: education_level_id
          ? parseInt(education_level_id)
          : null,
        field_of_study_id: field_of_study_id
          ? parseInt(field_of_study_id)
          : null,
        institution_id: institution_id ? parseInt(institution_id) : null,
        program_type,
        has_cost_sharing,
        cost_sharing_document_url,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        is_verified,
        is_current,
        cost_sharing_details,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Education record created successfully",
      data: { education: newEducation },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateEducations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const { employee_id, items } = req.body;
    if (!employee_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide employee_id and items array",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id_company_id: { id: employee_id, company_id: companyId } },
    });
    if (!employee)
      return res
        .status(404)
        .json({ status: "fail", message: "Employee not found" });

    const invalidItems = items.filter((item) => !item.program_type);
    if (invalidItems.length > 0)
      return res
        .status(400)
        .json({ status: "fail", message: "All items must have program_type" });

    const educationsToCreate = items.map((item) => ({
      employee_id,
      education_level_id: item.education_level_id
        ? parseInt(item.education_level_id)
        : null,
      field_of_study_id: item.field_of_study_id
        ? parseInt(item.field_of_study_id)
        : null,
      institution_id: item.institution_id
        ? parseInt(item.institution_id)
        : null,
      program_type: item.program_type,
      has_cost_sharing: item.has_cost_sharing || null,
      cost_sharing_document_url: item.cost_sharing_document_url || null,
      cost_sharing_details: item.cost_sharing_details || null,
      start_date: item.start_date ? new Date(item.start_date) : null,
      end_date: item.end_date ? new Date(item.end_date) : null,
      is_verified: item.is_verified || false,
      is_current: item.is_current || false,
    }));

    const createdEducations = await prisma.employeeEducation.createMany({
      data: educationsToCreate,
    });
    const educations = await prisma.employeeEducation.findMany({
      where: { employee_id },
      orderBy: { id: "desc" },
      take: createdEducations.count,
    });

    res.status(201).json({
      status: "success",
      message: `${createdEducations.count} education records created successfully`,
      data: { created: createdEducations.count, educations },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEducation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const existingEducation = await prisma.employeeEducation.findUnique({
      where: { id: parseInt(id) },
      include: { employee: { select: { company_id: true } } },
    });

    if (!existingEducation)
      return res
        .status(404)
        .json({ status: "fail", message: "Education record not found" });
    if (existingEducation.employee?.company_id !== companyId)
      return res.status(403).json({ status: "fail", message: "Access denied" });

    const {
      education_level_id,
      field_of_study_id,
      institution_id,
      program_type,
      has_cost_sharing,
      cost_sharing_document_url,
      start_date,
      end_date,
      is_verified,
      is_current,
      cost_sharing_details,
    } = req.body;

    const updatedEducation = await prisma.employeeEducation.update({
      where: { id: parseInt(id) },
      data: {
        ...(education_level_id !== undefined && {
          education_level_id: education_level_id
            ? parseInt(education_level_id)
            : null,
        }),
        ...(field_of_study_id !== undefined && {
          field_of_study_id: field_of_study_id
            ? parseInt(field_of_study_id)
            : null,
        }),
        ...(institution_id !== undefined && {
          institution_id: institution_id ? parseInt(institution_id) : null,
        }),
        ...(program_type && { program_type }),
        ...(has_cost_sharing !== undefined && { has_cost_sharing }),
        ...(cost_sharing_document_url !== undefined && {
          cost_sharing_document_url,
        }),
        ...(start_date !== undefined && {
          start_date: start_date ? new Date(start_date) : null,
        }),
        ...(end_date !== undefined && {
          end_date: end_date ? new Date(end_date) : null,
        }),
        ...(is_verified !== undefined && { is_verified }),
        ...(is_current !== undefined && { is_current }),
        ...(cost_sharing_details !== undefined && { cost_sharing_details }),
      },
    });

    res.status(200).json({
      status: "success",
      message: "Education record updated successfully",
      data: { education: updatedEducation },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEducation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const existingEducation = await prisma.employeeEducation.findUnique({
      where: { id: parseInt(id) },
      include: { employee: { select: { company_id: true } } },
    });

    if (!existingEducation)
      return res
        .status(404)
        .json({ status: "fail", message: "Education record not found" });
    if (existingEducation.employee?.company_id !== companyId)
      return res.status(403).json({ status: "fail", message: "Access denied" });

    await prisma.employeeEducation.delete({ where: { id: parseInt(id) } });
    res.status(200).json({
      status: "success",
      message: "Education record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteEducations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId)
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res
        .status(400)
        .json({ status: "fail", message: "Please provide ids array" });

    const educations = await prisma.employeeEducation.findMany({
      where: { id: { in: ids.map((id) => parseInt(id)) } },
      include: { employee: { select: { company_id: true } } },
    });

    const unauthorizedEducations = educations.filter(
      (edu) => edu.employee?.company_id !== companyId
    );
    if (unauthorizedEducations.length > 0)
      return res.status(403).json({
        status: "fail",
        message: "Access denied for some education records",
      });

    const deletedEducations = await prisma.employeeEducation.deleteMany({
      where: { id: { in: ids.map((id) => parseInt(id)) } },
    });
    res.status(200).json({
      status: "success",
      message: `${deletedEducations.count} education records deleted successfully`,
      data: { deleted: deletedEducations.count },
    });
  } catch (error) {
    next(error);
  }
};

export const replaceEmployeeEducations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.company_id;
    if (!companyId)
      return res.status(400).json({ status: "fail", message: "Company ID missing" });

    const { education } = req.body;

    await prisma.$transaction(async (tx) => {
      if (education && Array.isArray(education)) {
        // await tx.employeeCostSharing.deleteMany({ where: { employee_id: id } }); // Model does not exist
        await tx.employeeEducation.deleteMany({ where: { employee_id: id } });

        for (const edu of education) {
          // Upsert lookups
          let levelId = null, fieldId = null, instId = null;
          const levelName = edu.level || edu.education_level || edu.educationLevel;
          if (levelName) {
            const l = await tx.educationLevel.upsert({ where: { name: levelName }, update: {}, create: { name: levelName } });
            levelId = l.id;
          }
          const fieldName = edu.fieldOfStudy || edu.field_of_study;
          if (fieldName) {
            const f = await tx.fieldOfStudy.upsert({ where: { name: fieldName }, update: {}, create: { name: fieldName } });
            fieldId = f.id;
          }
          const instName = edu.institution || edu.institution_name;
          if (instName) {
            const i = await tx.institution.upsert({ where: { name: instName }, update: {}, create: { name: instName, category: 'Private' } });
            instId = i.id;
          }

          const rawStartDate = edu.startDate || edu.start_date;
          const rawEndDate = edu.endDate || edu.end_date;

          const startDate = rawStartDate ? new Date(rawStartDate) : null;
          const endDate = rawEndDate ? new Date(rawEndDate) : null;

          await tx.employeeEducation.create({
            data: {
              employee_id: id,
              education_level_id: levelId,
              field_of_study_id: fieldId,
              institution_id: instId,
              program_type: edu.programType || edu.program_type || "Regular",
              // document_url: edu.documentUrl || edu.document_url || null, // Field does not exist
              start_date: startDate && !isNaN(startDate.getTime()) ? startDate : null,
              end_date: endDate && !isNaN(endDate.getTime()) ? endDate : null,
              is_current: !!(edu.isCurrent || edu.is_current),
              cost_sharing_details: edu.costSharingDetails || edu.cost_sharing_details || null
            }
          });

          // Cost sharing logic removed as model does not exist
        }
      }
    });

    res.status(200).json({ status: "success", message: "Education details updated" });
  } catch (error) {
    next(error);
  }
};

