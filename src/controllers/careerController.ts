/**
 * Career Controller for Aastu HRIS
 *
 * Handles promotion, demotion, and transfer operations for employees.
 * Uses the existing EmployeeCareerEvent model for tracking career changes.
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";
import { getCareerEventEmailHtml } from "src/utils/emailTemplates";
import { sendEmail } from "src/utils/email";

// ============================================
// PROMOTE EMPLOYEE
// ============================================

export const promoteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const recordedBy = req.user?.employee_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const {
      employee_id,
      new_job_title_id,
      new_salary,
      new_department_id,
      effective_date,
      justification,
      notes,
      approved_by,
    } = req.body;

    // Validate required fields
    if (!employee_id || !new_job_title_id || !new_salary || !effective_date) {
      return res.status(400).json({
        status: "fail",
        message:
          "employee_id, new_job_title_id, new_salary, and effective_date are required",
      });
    }

    // Get current employment
    const currentEmployment = await prisma.employment.findFirst({
      where: {
        employee_id,
        company_id: companyId,
        is_active: true,
      },
      include: {
        employee: true,
        jobTitle: true,
        department: true,
      },
    });

    if (!currentEmployment) {
      return res.status(404).json({
        status: "fail",
        message: "Active employment not found for this employee",
      });
    }

    // Get new job title
    const newJobTitle = await prisma.jobTitle.findFirst({
      where: { id: new_job_title_id, company_id: companyId },
    });

    if (!newJobTitle) {
      return res.status(404).json({
        status: "fail",
        message: "New job title not found",
      });
    }

    // Get new department if specified
    let newDepartment = null;
    if (new_department_id) {
      newDepartment = await prisma.department.findFirst({
        where: { id: new_department_id, company_id: companyId },
      });
      if (!newDepartment) {
        return res.status(404).json({
          status: "fail",
          message: "New department not found",
        });
      }
    }

    // Create career event and update employment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the career event record
      const careerEvent = await tx.employeeCareerEvent.create({
        data: {
          employee_id,
          event_type: "Promotion",
          event_date: new Date(),
          effective_date: new Date(effective_date),
          previous_employment_id: currentEmployment.id,
          previous_job_title_id: currentEmployment.job_title_id,
          new_job_title_id,
          previous_salary: currentEmployment.gross_salary,
          new_salary: parseFloat(new_salary),
          department_changed:
            new_department_id !== null &&
            new_department_id !== currentEmployment.department_id,
          justification,
          notes,
          approved_by,
          recorded_by: recordedBy,
        },
        include: {
          employee: true,
          previousJobTitle: true,
          newJobTitle: true,
        },
      });

      // Update the current employment with new details
      const updatedEmployment = await tx.employment.update({
        where: { id: currentEmployment.id },
        data: {
          job_title_id: new_job_title_id,
          gross_salary: parseFloat(new_salary),
          ...(new_department_id && { department_id: new_department_id }),
        },
        include: {
          employee: true,
          jobTitle: true,
          department: true,
        },
      });

      return { careerEvent, updatedEmployment };
    });

    // Send notification email to employee (only if the employee has an AppUser/login email)
    const employeeUser = await prisma.appUser.findFirst({
      where: { employee_id, company_id: companyId },
      select: { email: true },
    });

    if (employeeUser?.email) {
      const emailHtml = getCareerEventEmailHtml(
        currentEmployment.employee.full_name,
        "promotion",
        currentEmployment.jobTitle?.title || "Previous Position",
        newJobTitle.title,
        effective_date,
        parseFloat(new_salary),
        justification
      );

      const emailResult = await sendEmail({
        to: employeeUser.email,
        subject: "Congratulations on Your Promotion! - Aastu HRIS",
        html: emailHtml,
      });

      console.log(
        "[Career] Promotion email result:",
        JSON.stringify(
          {
            employee_id,
            to: employeeUser.email,
            success: emailResult.success,
            provider: emailResult.provider,
            messageId: emailResult.messageId,
            error: emailResult.error,
          },
          null,
          2
        )
      );
    } else {
      console.warn(
        "[Career] Promotion email skipped: employee has no AppUser email",
        JSON.stringify({ employee_id, company_id: companyId }, null, 2)
      );
    }

    res.status(201).json({
      status: "success",
      message: "Employee promoted successfully",
      data: {
        careerEvent: result.careerEvent,
        employment: result.updatedEmployment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// DEMOTE EMPLOYEE
// ============================================

export const demoteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const recordedBy = req.user?.employee_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const {
      employee_id,
      new_job_title_id,
      new_salary,
      new_department_id,
      effective_date,
      justification,
      notes,
      approved_by,
    } = req.body;

    // Validate required fields
    if (
      !employee_id ||
      !new_job_title_id ||
      !new_salary ||
      !effective_date ||
      !justification
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "employee_id, new_job_title_id, new_salary, effective_date, and justification are required for demotion",
      });
    }

    // Get current employment
    const currentEmployment = await prisma.employment.findFirst({
      where: {
        employee_id,
        company_id: companyId,
        is_active: true,
      },
      include: {
        employee: true,
        jobTitle: true,
        department: true,
      },
    });

    if (!currentEmployment) {
      return res.status(404).json({
        status: "fail",
        message: "Active employment not found for this employee",
      });
    }

    // Get new job title
    const newJobTitle = await prisma.jobTitle.findFirst({
      where: { id: new_job_title_id, company_id: companyId },
    });

    if (!newJobTitle) {
      return res.status(404).json({
        status: "fail",
        message: "New job title not found",
      });
    }

    // Create career event and update employments
    const result = await prisma.$transaction(async (tx:any) => {
      const careerEvent = await tx.employeeCareerEvent.create({
        data: {
          employee_id,
          event_type: "Demotion",
          event_date: new Date(),
          effective_date: new Date(effective_date),
          previous_employment_id: currentEmployment.id,
          previous_job_title_id: currentEmployment.job_title_id,
          new_job_title_id,
          previous_salary: currentEmployment.gross_salary,
          new_salary: parseFloat(new_salary),
          department_changed:
            new_department_id !== null &&
            new_department_id !== currentEmployment.department_id,
          justification,
          notes,
          approved_by,
          recorded_by: recordedBy,
        },
        include: {
          employee: true,
          previousJobTitle: true,
          newJobTitle: true,
        },
      });

      const updatedEmployment = await tx.employment.update({
        where: { id: currentEmployment.id },
        data: {
          job_title_id: new_job_title_id,
          gross_salary: parseFloat(new_salary),
          ...(new_department_id && { department_id: new_department_id }),
        },
        include: {
          employee: true,
          jobTitle: true,
          department: true,
        },
      });

      return { careerEvent, updatedEmployment };
    });

    // Send notification email (only if the employee has an AppUser/login email)
    const employeeUser = await prisma.appUser.findFirst({
      where: { employee_id, company_id: companyId },
      select: { email: true },
    });

    if (employeeUser?.email) {
      const emailHtml = getCareerEventEmailHtml(
        currentEmployment.employee.full_name,
        "demotion",
        currentEmployment.jobTitle?.title || "Previous Position",
        newJobTitle.title,
        effective_date,
        parseFloat(new_salary),
        justification
      );

      const emailResult = await sendEmail({
        to: employeeUser.email,
        subject: "Position Change Notice - Aastu HRIS",
        html: emailHtml,
      });

      console.log(
        "[Career] Demotion email result:",
        JSON.stringify(
          {
            employee_id,
            to: employeeUser.email,
            success: emailResult.success,
            provider: emailResult.provider,
            messageId: emailResult.messageId,
            error: emailResult.error,
          },
          null,
          2
        )
      );
    } else {
      console.warn(
        "[Career] Demotion email skipped: employee has no AppUser email",
        JSON.stringify({ employee_id, company_id: companyId }, null, 2)
      );
    }

    res.status(201).json({
      status: "success",
      message: "Employee demotion recorded successfully",
      data: {
        careerEvent: result.careerEvent,
        employment: result.updatedEmployment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// TRANSFER EMPLOYEE
// ============================================

export const transferEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const recordedBy = req.user?.employee_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const {
      employee_id,
      new_department_id,
      new_job_title_id,
      effective_date,
      justification,
      notes,
      approved_by,
    } = req.body;

    if (!employee_id || !new_department_id || !effective_date) {
      return res.status(400).json({
        status: "fail",
        message:
          "employee_id, new_department_id, and effective_date are required",
      });
    }

    // Get current employment
    const currentEmployment = await prisma.employment.findFirst({
      where: {
        employee_id,
        company_id: companyId,
        is_active: true,
      },
      include: {
        employee: true,
        jobTitle: true,
        department: true,
      },
    });

    if (!currentEmployment) {
      return res.status(404).json({
        status: "fail",
        message: "Active employment not found for this employee",
      });
    }

    // Get new department
    const newDepartment = await prisma.department.findFirst({
      where: { id: new_department_id, company_id: companyId },
    });

    if (!newDepartment) {
      return res.status(404).json({
        status: "fail",
        message: "New department not found",
      });
    }

    // Get new job title if specified
    let newJobTitle = null;
    if (new_job_title_id) {
      newJobTitle = await prisma.jobTitle.findFirst({
        where: { id: new_job_title_id, company_id: companyId },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const careerEvent = await tx.employeeCareerEvent.create({
        data: {
          employee_id,
          event_type: "Transfer",
          event_date: new Date(),
          effective_date: new Date(effective_date),
          previous_employment_id: currentEmployment.id,
          previous_job_title_id: currentEmployment.job_title_id,
          new_job_title_id: new_job_title_id || currentEmployment.job_title_id,
          previous_salary: currentEmployment.gross_salary,
          new_salary: currentEmployment.gross_salary, // Salary unchanged for transfer
          department_changed: true,
          justification,
          notes,
          approved_by,
          recorded_by: recordedBy,
        },
        include: {
          employee: true,
          previousJobTitle: true,
          newJobTitle: true,
        },
      });

      const updatedEmployment = await tx.employment.update({
        where: { id: currentEmployment.id },
        data: {
          department_id: new_department_id,
          ...(new_job_title_id && { job_title_id: new_job_title_id }),
        },
        include: {
          employee: true,
          jobTitle: true,
          department: true,
        },
      });

      return { careerEvent, updatedEmployment };
    });

    // Send notification email (only if the employee has an AppUser/login email)
    const employeeUser = await prisma.appUser.findFirst({
      where: { employee_id, company_id: companyId },
      select: { email: true },
    });

    if (employeeUser?.email) {
      const emailHtml = getCareerEventEmailHtml(
        currentEmployment.employee.full_name,
        "transfer",
        `${currentEmployment.jobTitle?.title || "Position"} (${
          currentEmployment.department?.name || "Department"
        })`,
        `${
          newJobTitle?.title || currentEmployment.jobTitle?.title || "Position"
        } (${newDepartment.name})`,
        effective_date,
        undefined,
        justification
      );

      const emailResult = await sendEmail({
        to: employeeUser.email,
        subject: "Department Transfer Notice - Aastu HRIS",
        html: emailHtml,
      });

      console.log(
        "[Career] Transfer email result:",
        JSON.stringify(
          {
            employee_id,
            to: employeeUser.email,
            success: emailResult.success,
            provider: emailResult.provider,
            messageId: emailResult.messageId,
            error: emailResult.error,
          },
          null,
          2
        )
      );
    } else {
      console.warn(
        "[Career] Transfer email skipped: employee has no AppUser email",
        JSON.stringify({ employee_id, company_id: companyId }, null, 2)
      );
    }

    res.status(201).json({
      status: "success",
      message: "Employee transfer recorded successfully",
      data: {
        careerEvent: result.careerEvent,
        employment: result.updatedEmployment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET CAREER EVENTS FOR EMPLOYEE
// ============================================

export const getEmployeeCareerEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const { employeeId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    // Verify employee belongs to company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, company_id: companyId },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    const careerEvents = await prisma.employeeCareerEvent.findMany({
      where: { employee_id: employeeId },
      include: {
        previousJobTitle: true,
        newJobTitle: true,
        approver: { select: { id: true, full_name: true } },
        recorder: { select: { id: true, full_name: true } },
      },
      orderBy: { event_date: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: {
        employee: {
          id: employee.id,
          full_name: employee.full_name,
        },
        careerEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET ALL CAREER EVENTS (PAGINATED)
// ============================================

export const getAllCareerEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const eventType = req.query.event_type as string;
    const employeeId = req.query.employee_id as string;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const where: any = {
      employee: { company_id: companyId },
    };

    if (eventType) {
      where.event_type = eventType;
    }
    if (employeeId) {
      where.employee_id = employeeId;
    }
    if (dateFrom || dateTo) {
      where.event_date = {};
      if (dateFrom) where.event_date.gte = new Date(dateFrom);
      if (dateTo) where.event_date.lte = new Date(dateTo);
    }

    const [careerEvents, total] = await Promise.all([
      prisma.employeeCareerEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, full_name: true } },
          previousJobTitle: true,
          newJobTitle: true,
          approver: { select: { id: true, full_name: true } },
        },
        orderBy: { event_date: "desc" },
      }),
      prisma.employeeCareerEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      data: {
        careerEvents,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
