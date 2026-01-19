import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";
import { sendEmail } from "src/utils/email";
import {
  calculateWorkingDays,
  calculateReturnDate,
  validateLeaveDates,
  datesOverlap,
  getLeaveStatistics,
  getFiscalYear,
  calculateYearsOfService,
  calculateLeaveEntitlement,
} from "src/utils/leaveUtils";
import { getLeaveApplicationEmailHtml } from "src/utils/emailTemplates";
import { RoleNames } from "src/utils/roleConstants";

/**
 * Get all leave applications (Admin/HR view)
 */
export const getAllLeaveApplications = async (
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
    const status = req.query.status as string;
    const leaveTypeId = req.query.leave_type_id as string;
    const employeeId = req.query.employee_id as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const where: any = {
      company_id: companyId,
    };

    if (status) {
      where.current_status = status;
    }

    if (leaveTypeId) {
      where.leave_type_id = Number(leaveTypeId);
    }

    if (employeeId) {
      where.employee_id = employeeId;
    }

    if (startDate) {
      where.start_date = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.end_date = { ...(where.end_date || {}), lte: new Date(endDate) };
    }

    // Sorting
    const sortBy = (req.query.sortBy as string) || "created_at";
    const order = (req.query.order as string) || "desc";

    const [applications, total] = await Promise.all([
      prisma.leaveApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
              gender: true,
              employments: {
                where: { is_active: true },
                select: {
                  department: { select: { name: true } },
                  jobTitle: { select: { title: true, level: true } },
                  gross_salary: true,
                  start_date: true,
                },
                take: 1,
              },
            },
          },
          leaveType: true,
          reliefOfficer: {
            select: {
              id: true,
              full_name: true,
            },
          },
          approvalLogs: {
            orderBy: { action_date: "desc" },
            include: {
              approver: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
        },
      }),
      prisma.leaveApplication.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      message: "Leave applications fetched successfully",
      data: {
        applications,
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

/**
 * Get my leave applications (Employee view)
 */
export const getMyLeaveApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;

    if (!companyId || !employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const year = req.query.year as string;

    const where: any = {
      company_id: companyId,
      employee_id: employeeId,
    };

    if (status) {
      where.current_status = status;
    }

    if (year) {
      const yearStart = new Date(Number(year), 0, 1);
      const yearEnd = new Date(Number(year), 11, 31);
      where.start_date = {
        gte: yearStart,
        lte: yearEnd,
      };
    }

    const [applications, total] = await Promise.all([
      prisma.leaveApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          leaveType: true,
          reliefOfficer: {
            select: {
              id: true,
              full_name: true,
            },
          },
          approvalLogs: {
            orderBy: { action_date: "desc" },
            include: {
              approver: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
        },
      }),
      prisma.leaveApplication.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      message: "Leave applications fetched successfully",
      data: {
        applications,
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

/**
 * Get pending leave applications (for approvers)
 */
export const getPendingLeaveApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;
    const userRole = req.user?.role;

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

    let where: any = {
      company_id: companyId,
    };

    // Filter based on user role and approval level
    if (userRole === RoleNames.HR) {
      where.current_status = "PENDING_HR";
    } else if (
      ["CEO", "Managing Director", "General Manager"].includes(userRole || "")
    ) {
      where.current_status = "PENDING_CEO";
    } else if (
      employeeId &&
      userRole !== RoleNames.ADMIN &&
      userRole !== RoleNames.SUPERADMIN
    ) {
      // Supervisor - get applications from direct reports
      where.current_status = "PENDING_SUPERVISOR";
      where.employee = {
        employments: {
          some: {
            manager_id: employeeId,
            is_active: true,
          },
        },
      };
    } else {
      // Default - show all pending
      where.current_status = {
        in: ["PENDING_SUPERVISOR", "PENDING_HR", "PENDING_CEO"],
      };
    }

    const [applications, total] = await Promise.all([
      prisma.leaveApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "asc" }, // FIFO
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
              gender: true,
              employments: {
                where: { is_active: true },
                select: {
                  department: { select: { name: true } },
                  jobTitle: { select: { title: true, level: true } },
                },
                take: 1,
              },
            },
          },
          leaveType: true,
          reliefOfficer: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      }),
      prisma.leaveApplication.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      message: "Pending leave applications fetched successfully",
      data: {
        applications,
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

/**
 * Get a single leave application by ID
 */
export const getLeaveApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const application = await prisma.leaveApplication.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            gender: true,
            date_of_birth: true,
            place_of_work: true,
            employments: {
              where: { is_active: true },
              select: {
                department: { select: { name: true } },
                jobTitle: { select: { title: true, level: true } },
                gross_salary: true,
                start_date: true,
              },
              take: 1,
            },
          },
        },
        leaveType: true,
        reliefOfficer: {
          select: {
            id: true,
            full_name: true,
          },
        },
        approvalLogs: {
          orderBy: { action_date: "asc" },
          include: {
            approver: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        },
        leaveRecalls: {
          orderBy: { created_at: "desc" },
          include: {
            recalledBy: {
              select: {
                id: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "Leave application not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Leave application fetched successfully",
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new leave application
 */
export const createLeaveApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;

    if (!companyId || !employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    const {
      leave_type_id,
      start_date,
      end_date,
      reason,
      relief_officer_id,
      attachment_url,
    } = req.body;

    // Validation
    if (!leave_type_id || !start_date || !end_date) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide leave_type_id, start_date, and end_date",
      });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    // Validate leave type exists and is applicable
    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: Number(leave_type_id),
        company_id: companyId,
      },
    });

    if (!leaveType) {
      return res.status(404).json({
        status: "fail",
        message: "Leave type not found",
      });
    }

    // Check gender eligibility
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
      include: {
        employments: {
          where: { is_active: true },
          select: {
            start_date: true,
            jobTitle: { select: { level: true } },
          },
          take: 1,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Normalize gender for comparison (handle "M"/"Male" and "F"/"Female")
    const normalizeGender = (
      gender: string | null | undefined
    ): string | null => {
      if (!gender) return null;
      const normalized = gender.trim().toUpperCase();
      if (normalized === "M" || normalized === "MALE") return "Male";
      if (normalized === "F" || normalized === "FEMALE") return "Female";
      return gender; // Return as-is if it's already "Male" or "Female"
    };

    const employeeGenderNormalized = normalizeGender(employee.gender);
    const leaveTypeGender = leaveType.applicable_gender;

    if (
      leaveTypeGender !== "All" &&
      leaveTypeGender !== employeeGenderNormalized
    ) {
      return res.status(400).json({
        status: "fail",
        message: `This leave type is only applicable for ${leaveTypeGender} employees`,
      });
    }

    // Calculate working days or calendar days based on leave type
    let requestedDays: number;
    const isCalendarDaysLeave =
      leaveType.is_calendar_days ||
      ["MATERNITY_PRE", "MATERNITY_POST", "PATERNITY"].includes(leaveType.code);

    if (isCalendarDaysLeave) {
      // For maternity/paternity, use consecutive calendar days
      const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
      requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else {
      // For other leave types, calculate working days
      requestedDays = await calculateWorkingDays(
        startDateObj,
        endDateObj,
        companyId
      );
    }

    // Calculate return date
    const returnDate = await calculateReturnDate(endDateObj, companyId);

    // Validate dates
    const dateValidation = validateLeaveDates(
      startDateObj,
      endDateObj,
      returnDate
    );
    if (!dateValidation.valid) {
      return res.status(400).json({
        status: "fail",
        message: dateValidation.message,
      });
    }

    // Check for overlapping leave applications
    const overlappingLeave = await prisma.leaveApplication.findFirst({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        current_status: {
          in: ["PENDING_SUPERVISOR", "PENDING_HR", "PENDING_CEO", "APPROVED"],
        },
        OR: [
          {
            AND: [
              { start_date: { lte: endDateObj } },
              { end_date: { gte: startDateObj } },
            ],
          },
        ],
      },
    });

    if (overlappingLeave) {
      return res.status(400).json({
        status: "fail",
        message: "You already have a leave application for overlapping dates",
      });
    }

    // Get fiscal year for balance checks
    const fiscalYear = await getFiscalYear(companyId);

    // Special validation for Unpaid Leave
    if (leaveType.code === "UNPAID") {
      // Check max 5 consecutive days
      if (requestedDays > 5) {
        return res.status(400).json({
          status: "fail",
          message: "Unpaid leave cannot exceed 5 consecutive days per request",
        });
      }

      // Check usage count (max 2 per budget year)
      const unpaidUsage = await prisma.unpaidLeaveUsage.findUnique({
        where: {
          employee_id_company_id_fiscal_year: {
            employee_id: employeeId,
            company_id: companyId,
            fiscal_year: fiscalYear,
          },
        },
      });

      if (unpaidUsage && unpaidUsage.usage_count >= 2) {
        return res.status(400).json({
          status: "fail",
          message:
            "Unpaid leave can only be granted twice per budget year. You have already used your 2 unpaid leave requests.",
        });
      }
    }

    // Check leave balance for ALL leave types (enforce limits)
    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: {
        employee_id_leave_type_id_fiscal_year: {
          employee_id: employeeId,
          leave_type_id: Number(leave_type_id),
          fiscal_year: fiscalYear,
        },
      },
    });

    if (leaveBalance) {
      const availableDays =
        Number(leaveBalance.total_entitlement) -
        Number(leaveBalance.used_days) -
        Number(leaveBalance.pending_days || 0);

      if (requestedDays > availableDays) {
        return res.status(400).json({
          status: "fail",
          message: `Insufficient ${leaveType.name} balance. Available: ${availableDays} days, Requested: ${requestedDays} days`,
        });
      }
    } else {
      // If no balance exists, check against default allowance
      if (requestedDays > leaveType.default_allowance_days) {
        return res.status(400).json({
          status: "fail",
          message: `Cannot request more than ${leaveType.default_allowance_days} days for ${leaveType.name}`,
        });
      }
    }

    // Check if attachment is required
    if (leaveType.requires_attachment && !attachment_url) {
      return res.status(400).json({
        status: "fail",
        message: "This leave type requires a supporting document/attachment",
      });
    }

    // Validate relief officer if provided
    if (relief_officer_id) {
      const reliefOfficer = await prisma.employee.findUnique({
        where: {
          id_company_id: {
            id: relief_officer_id,
            company_id: companyId,
          },
        },
      });

      if (!reliefOfficer) {
        return res.status(404).json({
          status: "fail",
          message: "Relief officer not found",
        });
      }
    }

    // Create leave application
    const application = await prisma.leaveApplication.create({
      data: {
        employee_id: employeeId,
        company_id: companyId,
        leave_type_id: Number(leave_type_id),
        start_date: startDateObj,
        end_date: endDateObj,
        return_date: returnDate,
        requested_days: requestedDays,
        reason: reason || null,
        attachment_url: attachment_url || null,
        relief_officer_id: relief_officer_id || null,
        relief_company_id: relief_officer_id ? companyId : null,
        current_status: "PENDING_SUPERVISOR",
      },
      include: {
        leaveType: true,
        reliefOfficer: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    // Update pending days in leave balance for all leave types
    await prisma.leaveBalance.upsert({
      where: {
        employee_id_leave_type_id_fiscal_year: {
          employee_id: employeeId,
          leave_type_id: Number(leave_type_id),
          fiscal_year: fiscalYear,
        },
      },
      update: {
        pending_days: {
          increment: requestedDays,
        },
      },
      create: {
        employee_id: employeeId,
        company_id: companyId,
        leave_type_id: Number(leave_type_id),
        fiscal_year: fiscalYear,
        total_entitlement: (() => {
          // Calculate dynamic entitlement based on tenure
          const hireDate = employee.employments[0]?.start_date ?? new Date();
          const yearsOfService = calculateYearsOfService(hireDate);

          return calculateLeaveEntitlement(
            leaveType.default_allowance_days,
            leaveType.incremental_days_per_year || 0,
            yearsOfService,
            leaveType.max_accrual_limit,
            leaveType.incremental_period_years || 2 // Default to 2 if not set
          );
        })(),
        used_days: 0,
        pending_days: requestedDays,
      },
    });

    // TODO: Send notification to supervisor

    res.status(201).json({
      status: "success",
      message: "Leave application submitted successfully",
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a leave application
 */
export const approveLeaveApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    const approverId = req.user?.employee_id;
    const userRole = req.user?.role;

    if (!companyId || !approverId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    const { comments } = req.body;

    // Get the application
    const application = await prisma.leaveApplication.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            appUsers: {
              select: { email: true },
              where: { is_active: true },
              take: 1,
            },
            employments: {
              where: { is_active: true },
              select: {
                manager_id: true,
                jobTitle: { select: { level: true } },
              },
              take: 1,
            },
          },
        },
        leaveType: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "Leave application not found",
      });
    }

    // Validate current status and approver authorization
    let approverRole: string;
    let nextStatus: string;

    const currentStatus = application.current_status;
    const employment = application.employee.employments[0];
    const employeeLevel = employment?.jobTitle?.level || "";
    const isAdmin = userRole === RoleNames.ADMIN;

    const managerLevels = ["Manager", "Director", "Executive"];
    const leaveSettings = await prisma.leaveSettings.findUnique({
      where: { company_id: companyId },
      select: { require_ceo_approval_for_managers: true },
    });
    const requireCeoApprovalForManagers =
      leaveSettings?.require_ceo_approval_for_managers ?? true;

    if (currentStatus === "PENDING_SUPERVISOR") {
      // Admin can approve at any stage, or the direct supervisor
      if (!isAdmin && employment?.manager_id !== approverId) {
        return res.status(403).json({
          status: "fail",
          message: "You are not authorized to approve this application",
        });
      }
      approverRole = isAdmin ? "Admin (Supervisor Override)" : "Supervisor";
      nextStatus = "PENDING_HR";
    } else if (currentStatus === "PENDING_HR") {
      // Check if approver is HR or Admin
      if (userRole !== RoleNames.HR && !isAdmin) {
        return res.status(403).json({
          status: "fail",
          message: "Only HR can approve at this stage",
        });
      }
      approverRole = isAdmin ? "Admin (HR)" : "HR";
      // If CEO approval for managers is disabled, HR can fully approve.
      // Otherwise, only manager-level employees go to CEO.
      const isManagerLevel = managerLevels.includes(employeeLevel);
      if (isManagerLevel && requireCeoApprovalForManagers) {
        nextStatus = "PENDING_CEO";
      } else {
        nextStatus = "APPROVED";
      }
    } else if (currentStatus === "PENDING_CEO") {
      // If CEO approval for managers is disabled, do not enforce CEO stage.
      // Allow HR (or Admin) to finalize any applications already sitting in PENDING_CEO.
      if (!requireCeoApprovalForManagers) {
        if (userRole !== RoleNames.HR && !isAdmin) {
          return res.status(403).json({
            status: "fail",
            message: "Only HR can approve at this stage",
          });
        }
        approverRole = isAdmin ? "Admin (HR)" : "HR";
        nextStatus = "APPROVED";
      } else {
        // Check if approver is CEO or Admin
        if (
          !isAdmin &&
          !["CEO", "Managing Director", "General Manager"].includes(
            userRole || ""
          )
        ) {
          return res.status(403).json({
            status: "fail",
            message: "Only CEO can approve at this stage",
          });
        }
        approverRole = isAdmin ? "Admin (CEO)" : "CEO";
        nextStatus = "APPROVED";
      }
    } else {
      return res.status(400).json({
        status: "fail",
        message: `Cannot approve application with status: ${currentStatus}`,
      });
    }

    // Update application status
    const updatedApplication = await prisma.leaveApplication.update({
      where: { id: Number(id) },
      data: {
        current_status: nextStatus,
        updated_at: new Date(),
      },
    });

    // Create approval log
    await prisma.leaveApprovalLog.create({
      data: {
        application_id: Number(id),
        approver_id: approverId,
        approver_company_id: companyId,
        approver_role: approverRole,
        action: "APPROVED",
        comments: comments || null,
      },
    });

    // If fully approved, update leave balance and track usage
    if (nextStatus === "APPROVED") {
      const fiscalYear = await getFiscalYear(companyId);

      // Update used days and remove from pending
      await prisma.leaveBalance.updateMany({
        where: {
          employee_id: application.employee_id,
          leave_type_id: application.leave_type_id,
          fiscal_year: fiscalYear,
        },
        data: {
          used_days: {
            increment: Number(application.requested_days),
          },
          pending_days: {
            decrement: Number(application.requested_days),
          },
        },
      });

      // Track unpaid leave usage (max 2 per budget year)
      if (application.leaveType.code === "UNPAID") {
        await prisma.unpaidLeaveUsage.upsert({
          where: {
            employee_id_company_id_fiscal_year: {
              employee_id: application.employee_id,
              company_id: companyId,
              fiscal_year: fiscalYear,
            },
          },
          update: {
            usage_count: {
              increment: 1,
            },
          },
          create: {
            employee_id: application.employee_id,
            company_id: companyId,
            fiscal_year: fiscalYear,
            usage_count: 1,
          },
        });
      }

      const employeeEmail = application.employee.appUsers[0]?.email;
      if (employeeEmail) {
        try {
          await sendEmail({
            to: employeeEmail,
            subject: `Leave Application Approved: ${application.leaveType.name}`,
            html: getLeaveApplicationEmailHtml(
              application.employee.full_name,
              application.leaveType.name,
              new Date(application.start_date).toISOString(),
              new Date(application.end_date).toISOString(),
              Number(application.requested_days),
              "approved",
              comments || undefined,
              approverRole
            ),
          });
        } catch (emailError) {
          console.error(
            "Failed to send leave approval email:",
            emailError instanceof Error ? emailError.message : emailError
          );
        }
      }
    }

    res.status(200).json({
      status: "success",
      message:
        nextStatus === "APPROVED"
          ? "Leave application fully approved"
          : `Leave application approved and forwarded to ${nextStatus.replace(
              "PENDING_",
              ""
            )}`,
      data: { application: updatedApplication },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a leave application
 */
export const rejectLeaveApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    const approverId = req.user?.employee_id;
    const userRole = req.user?.role;

    if (!companyId || !approverId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    const { rejection_reason, comments } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a rejection reason",
      });
    }

    // Get the application
    const application = await prisma.leaveApplication.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
      include: {
        employee: {
          select: {
            full_name: true,
            appUsers: {
              select: { email: true },
              where: { is_active: true },
              take: 1,
            },
            employments: {
              where: { is_active: true },
              select: { manager_id: true },
              take: 1,
            },
          },
        },
        leaveType: {
          select: { name: true },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "Leave application not found",
      });
    }

    // Validate current status
    const currentStatus = application.current_status;
    if (
      !["PENDING_SUPERVISOR", "PENDING_HR", "PENDING_CEO"].includes(
        currentStatus || ""
      )
    ) {
      return res.status(400).json({
        status: "fail",
        message: `Cannot reject application with status: ${currentStatus}`,
      });
    }

    // Determine approver role
    const isAdmin = userRole === RoleNames.ADMIN;
    let approverRole: string;
    if (currentStatus === "PENDING_SUPERVISOR") {
      approverRole = isAdmin ? "Admin (Supervisor Override)" : "Supervisor";
    } else if (currentStatus === "PENDING_HR") {
      approverRole = isAdmin ? "Admin (HR)" : "HR";
    } else {
      approverRole = isAdmin ? "Admin (CEO)" : "CEO";
    }

    // Update application status
    const updatedApplication = await prisma.leaveApplication.update({
      where: { id: Number(id) },
      data: {
        current_status: "REJECTED",
        updated_at: new Date(),
      },
    });

    // Create rejection log
    await prisma.leaveApprovalLog.create({
      data: {
        application_id: Number(id),
        approver_id: approverId,
        approver_company_id: companyId,
        approver_role: approverRole,
        action: "REJECTED",
        comments: `${rejection_reason}${comments ? `. ${comments}` : ""}`,
      },
    });

    // Remove from pending days in leave balance
    const currentYear = new Date().getFullYear();
    await prisma.leaveBalance.updateMany({
      where: {
        employee_id: application.employee_id,
        leave_type_id: application.leave_type_id,
        fiscal_year: currentYear,
      },
      data: {
        pending_days: {
          decrement: Number(application.requested_days),
        },
      },
    });

    const employeeEmail = application.employee.appUsers[0]?.email;
    if (employeeEmail) {
      try {
        const rejectionMessage = `${rejection_reason}${
          comments ? `. ${comments}` : ""
        }`;

        await sendEmail({
          to: employeeEmail,
          subject: `Leave Application Rejected: ${application.leaveType.name}`,
          html: getLeaveApplicationEmailHtml(
            application.employee.full_name,
            application.leaveType.name,
            new Date(application.start_date).toISOString(),
            new Date(application.end_date).toISOString(),
            Number(application.requested_days),
            "rejected",
            rejectionMessage,
            approverRole
          ),
        });
      } catch (emailError) {
        console.error(
          "Failed to send leave rejection email:",
          emailError instanceof Error ? emailError.message : emailError
        );
      }
    }

    res.status(200).json({
      status: "success",
      message: "Leave application rejected",
      data: { application: updatedApplication },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a leave application (by employee)
 */
export const cancelLeaveApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;

    if (!companyId || !employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    // Get the application
    const application = await prisma.leaveApplication.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
        employee_id: employeeId,
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "Leave application not found",
      });
    }

    // Check if can be cancelled
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentStatus = application.current_status;
    const startDate = new Date(application.start_date);

    // Can cancel if pending or if approved but not started yet
    if (
      !["PENDING_SUPERVISOR", "PENDING_HR", "PENDING_CEO", "APPROVED"].includes(
        currentStatus || ""
      )
    ) {
      return res.status(400).json({
        status: "fail",
        message: "This leave application cannot be cancelled",
      });
    }

    // If approved, can only cancel if it hasn't started
    if (currentStatus === "APPROVED" && startDate <= today) {
      return res.status(400).json({
        status: "fail",
        message: "Cannot cancel a leave that has already started",
      });
    }

    // Update application status
    const updatedApplication = await prisma.leaveApplication.update({
      where: { id: Number(id) },
      data: {
        current_status: "CANCELLED",
        updated_at: new Date(),
      },
    });

    // Restore leave balance
    const currentYear = new Date().getFullYear();

    if (currentStatus === "APPROVED") {
      // Restore used days
      await prisma.leaveBalance.updateMany({
        where: {
          employee_id: application.employee_id,
          leave_type_id: application.leave_type_id,
          fiscal_year: currentYear,
        },
        data: {
          used_days: {
            decrement: Number(application.requested_days),
          },
        },
      });
    } else {
      // Remove from pending days
      await prisma.leaveBalance.updateMany({
        where: {
          employee_id: application.employee_id,
          leave_type_id: application.leave_type_id,
          fiscal_year: currentYear,
        },
        data: {
          pending_days: {
            decrement: Number(application.requested_days),
          },
        },
      });
    }

    res.status(200).json({
      status: "success",
      message: "Leave application cancelled successfully",
      data: { application: updatedApplication },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cancellable leaves for an employee
 */
export const getCancellableLeaves = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;

    if (!companyId || !employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const applications = await prisma.leaveApplication.findMany({
      where: {
        company_id: companyId,
        employee_id: employeeId,
        OR: [
          // Pending applications
          {
            current_status: {
              in: ["PENDING_SUPERVISOR", "PENDING_HR", "PENDING_CEO"],
            },
          },
          // Approved but not started
          {
            current_status: "APPROVED",
            start_date: { gt: today },
          },
        ],
      },
      include: {
        leaveType: true,
      },
      orderBy: { start_date: "asc" },
    });

    res.status(200).json({
      status: "success",
      message: "Cancellable leaves fetched successfully",
      data: { applications },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get employees currently on leave with full details
 */
export const getEmployeesOnLeave = async (
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

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const applications = await prisma.leaveApplication.findMany({
      where: {
        company_id: companyId,
        current_status: "APPROVED",
        // Check for overlap with "today":
        // Leave starts before or on today AND ends on or after today
        start_date: { lte: endOfDay },
        end_date: { gte: startOfDay },
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            gender: true,
            phones: {
              where: { is_primary: true },
              select: { phone_number: true },
              take: 1,
            },
            documents: {
              select: { photo: true },
            },
            employments: {
              where: { is_active: true },
              select: {
                department: { select: { id: true, name: true } },
                jobTitle: { select: { id: true, title: true, level: true } },
              },
              take: 1,
            },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            is_paid: true,
          },
        },
      },
      orderBy: {
        end_date: "asc",
      },
    });

    // Format response to be more frontend-friendly
    const formattedEmployees = applications.map((app) => ({
      application_id: app.id,
      employee_id: app.employee_id,
      full_name: app.employee.full_name,
      gender: app.employee.gender,
      phone: app.employee.phones[0]?.phone_number || null,
      photo: app.employee.documents?.photo || null,
      department: app.employee.employments[0]?.department?.name || null,
      job_title: app.employee.employments[0]?.jobTitle?.title || null,
      job_level: app.employee.employments[0]?.jobTitle?.level || null,
      leave_type: app.leaveType.name,
      leave_code: app.leaveType.code,
      is_paid: app.leaveType.is_paid,
      start_date: app.start_date,
      end_date: app.end_date,
      return_date: app.return_date,
      requested_days: app.requested_days,
      reason: app.reason,
    }));

    // Prevent caching to ensure fresh data
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).json({
      status: "success",
      message: "Employees on leave fetched successfully",
      data: {
        count: formattedEmployees.length,
        date: new Date().toISOString().split("T")[0],
        employees: formattedEmployees,
        applications: applications, // Include raw applications for generic components
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leave statistics (dashboard)
 */
export const getLeaveStats = async (
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

    const stats = await getLeaveStatistics(companyId);

    res.status(200).json({
      status: "success",
      message: "Leave statistics fetched successfully",
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get relief officers (employees who can cover during leave)
 */
export const getReliefOfficers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    // Get employees from the same department (excluding self)
    const currentEmployee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId || "",
          company_id: companyId,
        },
      },
      include: {
        employments: {
          where: { is_active: true },
          select: { department_id: true },
          take: 1,
        },
      },
    });

    const departmentId = currentEmployee?.employments[0]?.department_id;

    const where: any = {
      company_id: companyId,
      id: { not: employeeId },
      employments: {
        some: {
          is_active: true,
          ...(departmentId && { department_id: departmentId }),
        },
      },
    };

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        full_name: true,
        employments: {
          where: { is_active: true },
          select: {
            department: { select: { name: true } },
            jobTitle: { select: { title: true } },
          },
          take: 1,
        },
      },
      orderBy: { full_name: "asc" },
    });

    res.status(200).json({
      status: "success",
      message: "Relief officers fetched successfully",
      data: { employees },
    });
  } catch (error) {
    next(error);
  }
};
