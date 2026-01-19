import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";
import { calculateWorkingDays } from "src/utils/leaveUtils";

/**
 * Get all leave recalls (Admin/HR)
 */
export const getAllLeaveRecalls = async (
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

    const status = req.query.status as string;

    const where: any = {
      leaveApplication: {
        company_id: companyId,
      },
    };

    if (status) {
      where.status = status;
    }

    const [recalls, total] = await Promise.all([
      prisma.leaveRecall.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          leaveApplication: {
            include: {
              employee: {
                select: {
                  id: true,
                  full_name: true,
                  employments: {
                    where: { is_active: true },
                    select: {
                      department: { select: { name: true } },
                    },
                    take: 1,
                  },
                },
              },
              leaveType: true,
            },
          },
          recalledBy: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      }),
      prisma.leaveRecall.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      message: "Leave recalls fetched successfully",
      data: {
        recalls,
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
 * Get my recall notifications (Employee)
 */
export const getMyRecallNotifications = async (
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

    const recalls = await prisma.leaveRecall.findMany({
      where: {
        leaveApplication: {
          employee_id: employeeId,
          company_id: companyId,
        },
        status: "PENDING",
      },
      include: {
        leaveApplication: {
          include: {
            leaveType: true,
          },
        },
        recalledBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      status: "success",
      message: "Recall notifications fetched successfully",
      data: { recalls },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get employees currently on leave (for recall)
 */
export const getEmployeesOnLeaveForRecall = async (
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get leaves that are currently active and can be recalled
    // (exclude leaves that already have a pending recall)
    const applications = await prisma.leaveApplication.findMany({
      where: {
        company_id: companyId,
        current_status: "APPROVED",
        start_date: { lte: today },
        end_date: { gte: today },
        // Exclude already recalled or recalled pending
        leaveRecalls: {
          none: {
            status: "PENDING",
          },
        },
        // For managers: only show direct reports
        ...(employeeId && {
          employee: {
            employments: {
              some: {
                manager_id: employeeId,
                is_active: true,
              },
            },
          },
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            phones: {
              where: { is_primary: true },
              select: { phone_number: true },
              take: 1,
            },
            employments: {
              where: { is_active: true },
              select: {
                department: { select: { name: true } },
                jobTitle: { select: { title: true } },
              },
              take: 1,
            },
          },
        },
        leaveType: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Employees on leave fetched successfully",
      data: { applications },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a leave recall request (Manager/HR)
 */
export const createLeaveRecall = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const recalledById = req.user?.employee_id;

    if (!companyId || !recalledById) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or Employee ID not found in user session",
      });
    }

    const { leave_application_id, reason, recall_date } = req.body;

    // Validation
    if (!leave_application_id || !reason || !recall_date) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide leave_application_id, reason, and recall_date",
      });
    }

    // Get the leave application
    const application = await prisma.leaveApplication.findFirst({
      where: {
        id: Number(leave_application_id),
        company_id: companyId,
        current_status: "APPROVED",
      },
    });

    if (!application) {
      return res.status(404).json({
        status: "fail",
        message: "Leave application not found or not approved",
      });
    }

    // Check if employee is currently on leave
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      new Date(application.start_date) > today ||
      new Date(application.end_date) < today
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Employee is not currently on leave",
      });
    }

    // Check if recall date is valid
    const recallDateObj = new Date(recall_date);
    if (recallDateObj < today) {
      return res.status(400).json({
        status: "fail",
        message: "Recall date cannot be in the past",
      });
    }

    if (recallDateObj > new Date(application.end_date)) {
      return res.status(400).json({
        status: "fail",
        message: "Recall date cannot be after the leave end date",
      });
    }

    // Check if there's already a pending recall
    const existingRecall = await prisma.leaveRecall.findFirst({
      where: {
        leave_application_id: Number(leave_application_id),
        status: "PENDING",
      },
    });

    if (existingRecall) {
      return res.status(400).json({
        status: "fail",
        message: "There is already a pending recall for this leave",
      });
    }

    const recall = await prisma.leaveRecall.create({
      data: {
        leave_application_id: Number(leave_application_id),
        recalled_by: recalledById,
        recalled_by_company_id: companyId,
        reason,
        recall_date: recallDateObj,
        status: "PENDING",
      },
      include: {
        leaveApplication: {
          include: {
            employee: {
              select: { id: true, full_name: true },
            },
            leaveType: true,
          },
        },
        recalledBy: {
          select: { id: true, full_name: true },
        },
      },
    });

    // TODO: Send notification to employee

    res.status(201).json({
      status: "success",
      message: "Leave recall request created successfully",
      data: { recall },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Respond to a leave recall (Employee)
 */
export const respondToRecall = async (
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

    const { response, employee_response, actual_return_date } = req.body;

    if (!response || !["ACCEPTED", "DECLINED"].includes(response)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide response as 'ACCEPTED' or 'DECLINED'",
      });
    }

    // Get the recall
    const recall = await prisma.leaveRecall.findFirst({
      where: {
        id: Number(id),
        status: "PENDING",
        leaveApplication: {
          employee_id: employeeId,
          company_id: companyId,
        },
      },
      include: {
        leaveApplication: true,
      },
    });

    if (!recall) {
      return res.status(404).json({
        status: "fail",
        message: "Recall request not found or already processed",
      });
    }

    let daysRestored = 0;

    // If accepted, calculate days to restore
    if (response === "ACCEPTED") {
      const returnDate = actual_return_date
        ? new Date(actual_return_date)
        : new Date(recall.recall_date);
      
      const originalEndDate = new Date(recall.leaveApplication.end_date);

      // Calculate days from return date to original end date
      if (returnDate < originalEndDate) {
        daysRestored = await calculateWorkingDays(
          returnDate,
          originalEndDate,
          companyId
        );

        // Restore days to leave balance
        const currentYear = new Date().getFullYear();
        await prisma.leaveBalance.updateMany({
          where: {
            employee_id: recall.leaveApplication.employee_id,
            leave_type_id: recall.leaveApplication.leave_type_id,
            fiscal_year: currentYear,
          },
          data: {
            used_days: {
              decrement: daysRestored,
            },
          },
        });

        // Update leave application end date and days
        const newRequestedDays =
          Number(recall.leaveApplication.requested_days) - daysRestored;

        await prisma.leaveApplication.update({
          where: { id: recall.leaveApplication.id },
          data: {
            end_date: returnDate,
            return_date: returnDate,
            requested_days: newRequestedDays,
          },
        });
      }
    }

    // Update recall status
    const updatedRecall = await prisma.leaveRecall.update({
      where: { id: Number(id) },
      data: {
        status: response,
        employee_response: employee_response || null,
        responded_at: new Date(),
        actual_return_date: response === "ACCEPTED"
          ? (actual_return_date ? new Date(actual_return_date) : recall.recall_date)
          : null,
        days_restored: daysRestored,
      },
      include: {
        leaveApplication: {
          include: {
            employee: {
              select: { id: true, full_name: true },
            },
            leaveType: true,
          },
        },
        recalledBy: {
          select: { id: true, full_name: true },
        },
      },
    });

    // TODO: Notify manager of response

    res.status(200).json({
      status: "success",
      message: `Recall ${response.toLowerCase()} successfully${
        response === "ACCEPTED" && daysRestored > 0
          ? `. ${daysRestored} days restored to leave balance.`
          : ""
      }`,
      data: { recall: updatedRecall },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recall by ID
 */
export const getRecallById = async (
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

    const recall = await prisma.leaveRecall.findFirst({
      where: {
        id: Number(id),
        leaveApplication: {
          company_id: companyId,
        },
      },
      include: {
        leaveApplication: {
          include: {
            employee: {
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
            },
            leaveType: true,
          },
        },
        recalledBy: {
          select: { id: true, full_name: true },
        },
      },
    });

    if (!recall) {
      return res.status(404).json({
        status: "fail",
        message: "Recall not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Recall fetched successfully",
      data: { recall },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a recall request (Manager - before employee responds)
 */
export const cancelRecall = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    const employeeId = req.user?.employee_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    // Get the recall
    const recall = await prisma.leaveRecall.findFirst({
      where: {
        id: Number(id),
        status: "PENDING",
        recalled_by: employeeId || undefined,
        leaveApplication: {
          company_id: companyId,
        },
      },
    });

    if (!recall) {
      return res.status(404).json({
        status: "fail",
        message: "Recall not found or already processed",
      });
    }

    await prisma.leaveRecall.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({
      status: "success",
      message: "Recall cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

