import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

export const fetchAllHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
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

    const history = await prisma.employmentHistory.findMany({
      where: { employee_id: employeeId },
      include: { jobTitle: true },
      orderBy: { start_date: "desc" },
    });

    res
      .status(200)
      .json({
        status: "success",
        message: "Employment history fetched successfully",
        data: { history, total: history.length },
      });
  } catch (error) {
    next(error);
  }
};

export const fetchHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Company ID not found in user session",
        });

    const history = await prisma.employmentHistory.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: { select: { id: true, full_name: true, company_id: true } },
        jobTitle: true,
      },
    });

    if (!history)
      return res
        .status(404)
        .json({ status: "fail", message: "Employment history not found" });
    if (history.employee?.company_id !== companyId)
      return res.status(403).json({ status: "fail", message: "Access denied" });

    res
      .status(200)
      .json({
        status: "success",
        message: "Employment history fetched successfully",
        data: { history },
      });
  } catch (error) {
    next(error);
  }
};

export const createHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Company ID not found in user session",
        });

    const {
      employee_id,
      previous_company_name,
      job_title_id,
      previous_job_title_text,
      previous_level,
      department_name,
      start_date,
      end_date,
      is_verified,
      notes,
      document_urls,
    } = req.body;

    if (!employee_id || !previous_company_name || !start_date) {
      return res
        .status(400)
        .json({
          status: "fail",
          message:
            "Please provide employee_id, previous_company_name, and start_date",
        });
    }

    const employee = await prisma.employee.findUnique({
      where: { id_company_id: { id: employee_id, company_id: companyId } },
    });
    if (!employee)
      return res
        .status(404)
        .json({ status: "fail", message: "Employee not found" });

    const newHistory = await prisma.employmentHistory.create({
      data: {
        employee_id,
        previous_company_name,
        job_title_id: job_title_id ? parseInt(job_title_id) : null,
        previous_job_title_text,
        previous_level,
        department_name,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        document_urls: document_urls || [], // Handle document URLs
        is_verified,
        notes,
      },
    });

    res
      .status(201)
      .json({
        status: "success",
        message: "Employment history created successfully",
        data: { history: newHistory },
      });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Company ID not found in user session",
        });

    const { employee_id, items } = req.body;
    if (!employee_id || !items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({
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

    const invalidItems = items.filter(
      (item) => !item.previous_company_name || !item.start_date,
    );
    if (invalidItems.length > 0)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "All items must have previous_company_name and start_date",
        });

    const historyToCreate = items.map((item) => ({
      employee_id,
      previous_company_name: item.previous_company_name,
      job_title_id: item.job_title_id ? parseInt(item.job_title_id) : null,
      previous_job_title_text: item.previous_job_title_text || null,
      previous_level: item.previous_level || null,
      department_name: item.department_name || null,
      start_date: new Date(item.start_date),
      end_date: item.end_date ? new Date(item.end_date) : null,
      is_verified: item.is_verified || false,
      notes: item.notes || null,
    }));

    const createdHistory = await prisma.employmentHistory.createMany({
      data: historyToCreate,
    });
    const history = await prisma.employmentHistory.findMany({
      where: { employee_id },
      orderBy: { id: "desc" },
      take: createdHistory.count,
    });

    res
      .status(201)
      .json({
        status: "success",
        message: `${createdHistory.count} employment history records created successfully`,
        data: { created: createdHistory.count, history },
      });
  } catch (error) {
    next(error);
  }
};

export const updateHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Company ID not found in user session",
        });

    const existingHistory = await prisma.employmentHistory.findUnique({
      where: { id: parseInt(id) },
      include: { employee: { select: { company_id: true } } },
    });

    if (!existingHistory)
      return res
        .status(404)
        .json({ status: "fail", message: "Employment history not found" });
    if (existingHistory.employee?.company_id !== companyId)
      return res.status(403).json({ status: "fail", message: "Access denied" });

    const {
      previous_company_name,
      job_title_id,
      previous_job_title_text,
      previous_level,
      department_name,
      start_date,
      end_date,
      is_verified,
      notes,
    } = req.body;

    const updatedHistory = await prisma.employmentHistory.update({
      where: { id: parseInt(id) },
      data: {
        ...(previous_company_name && { previous_company_name }),
        ...(job_title_id !== undefined && {
          job_title_id: job_title_id ? parseInt(job_title_id) : null,
        }),
        ...(previous_job_title_text !== undefined && {
          previous_job_title_text,
        }),
        ...(previous_level !== undefined && { previous_level }),
        ...(department_name !== undefined && { department_name }),
        ...(start_date && { start_date: new Date(start_date) }),
        ...(end_date !== undefined && {
          end_date: end_date ? new Date(end_date) : null,
        }),
        ...(is_verified !== undefined && { is_verified }),
        ...(notes !== undefined && { notes }),
      },
    });

    res
      .status(200)
      .json({
        status: "success",
        message: "Employment history updated successfully",
        data: { history: updatedHistory },
      });
  } catch (error) {
    next(error);
  }
};

export const deleteHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Company ID not found in user session",
        });

    const existingHistory = await prisma.employmentHistory.findUnique({
      where: { id: parseInt(id) },
      include: { employee: { select: { company_id: true } } },
    });

    if (!existingHistory)
      return res
        .status(404)
        .json({ status: "fail", message: "Employment history not found" });
    if (existingHistory.employee?.company_id !== companyId)
      return res.status(403).json({ status: "fail", message: "Access denied" });

    await prisma.employmentHistory.delete({ where: { id: parseInt(id) } });
    res
      .status(200)
      .json({
        status: "success",
        message: "Employment history deleted successfully",
      });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId)
      return res
        .status(400)
        .json({
          status: "fail",
          message: "Company ID not found in user session",
        });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res
        .status(400)
        .json({ status: "fail", message: "Please provide ids array" });

    const history = await prisma.employmentHistory.findMany({
      where: { id: { in: ids.map((id) => parseInt(id)) } },
      include: { employee: { select: { company_id: true } } },
    });

    const unauthorizedHistory = history.filter(
      (h) => h.employee?.company_id !== companyId,
    );
    if (unauthorizedHistory.length > 0)
      return res
        .status(403)
        .json({
          status: "fail",
          message: "Access denied for some employment history records",
        });

    const deletedHistory = await prisma.employmentHistory.deleteMany({
      where: { id: { in: ids.map((id) => parseInt(id)) } },
    });
    res
      .status(200)
      .json({
        status: "success",
        message: `${deletedHistory.count} employment history records deleted successfully`,
        data: { deleted: deletedHistory.count },
      });
  } catch (error) {
    next(error);
  }
};

export const replaceEmployeeEmploymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.company_id;
    if (!companyId) return res.status(400).json({ status: "fail", message: "Company ID missing" });

    const { workExperience } = req.body;

    await prisma.$transaction(async (tx) => {
      if (workExperience && Array.isArray(workExperience)) {
        await tx.employmentHistory.deleteMany({ where: { employee_id: id } });

        const data = workExperience.map((exp: any) => {
          const startDate = exp.startDate || exp.start_date;
          const endDate = exp.endDate || exp.end_date;

          return {
            employee_id: id,
            previous_company_name: exp.companyName || exp.company_name || "",
            job_title_id: null, // Schema expects ID, but we might only have text? Schema defines relation.
            previous_job_title_text: exp.jobTitle || exp.job_title || "", // Map to text field
            previous_level: exp.level || exp.job_level || "",
            department_name: exp.department || "",
            // employment_type: exp.employmentType || exp.employment_type || "Full Time", // Schema doesn't have employment_type in History? Checked schema: it doesn't.
            start_date: startDate ? new Date(startDate) : new Date(),
            end_date: endDate ? new Date(endDate) : null,
            is_verified: !!(exp.isVerified || exp.is_verified),
            notes: exp.notes || null,
            document_urls: exp.documentUrls || exp.document_urls || []
          };
        });

         // Final check to prevent Invalid Date passing to Prisma
        const validData = data.filter((d: any) => !isNaN(d.start_date.getTime()));

        if (validData.length > 0) {
          await tx.employmentHistory.createMany({
            data: validData
          });
        }
      }
    });

    res.status(200).json({ status: "success", message: "Work experience updated" });
  } catch (error) {
    next(error);
  }
};

