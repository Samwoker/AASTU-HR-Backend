import { Request, Response, NextFunction } from "express";
import { OnboardingStatus } from "@prisma/client";
import { prisma } from "src/app";
import { RoleNames, SUPERADMIN_VARIANTS } from "src/utils/roleConstants";
import { initializeLeaveBalancesForEmployee } from "src/utils/leaveUtils";
import { sendEmail } from "src/utils/email";
import { getOnboardingApprovedEmailHtml } from "src/utils/emailTemplates";

export const countEmployees = async (
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

    const count = await prisma.employee.count({
      where: { company_id: companyId },
    });
    return res.status(200).json({
      status: "success",
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

export const fetchAllEmployee = async (
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

    // Filter parameters
    const search = req.query.search as string;
    const departmentId = req.query.department_id as string;
    const jobTitleId = req.query.job_title_id as string;
    const employmentType = req.query.employment_type as string;
    const status = req.query.status as string; // active, inactive, probation (Legacy)
    const onboardingStatus = req.query.onboarding_status as string; // COMPLETED, PENDING_APPROVAL, IN_PROGRESS
    const isActiveParam = req.query.is_active as string; // employment is_active filter
    const gender = req.query.gender as string;
    const hireDateFrom = req.query.hire_date_from as string;
    const hireDateTo = req.query.hire_date_to as string;
    const department = req.query.department as string; // department name filter
    const jobLevel = req.query.job_level as string;
    const sortBy = req.query.sort_by as string;
    const costSharingStatus = req.query.cost_sharing_status as string;

    // Build where clause
    const where: any = {
      company_id: companyId,
    };

    // Search filter (name, employee_id, tin_number)
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
        { tin_number: { contains: search, mode: "insensitive" } },
      ];
    }

    // Gender filter
    if (gender) {
      where.gender = gender;
    }

    // Build appUsers filter conditions (for tab navigation)
    const appUsersConditions: any = {};

    // Onboarding Status Filter (All Employees, Pending Approval, In Progress)
    if (onboardingStatus) {
      const statusArray = onboardingStatus.split(",").map((s) => s.trim());
      appUsersConditions.onboarding_status =
        statusArray.length === 1 ? statusArray[0] : { in: statusArray };
    }

    // is_active Filter (for employment status)
    if (isActiveParam !== undefined) {
      const isActive = isActiveParam === "true";
      appUsersConditions.is_active = isActive;
    }

    // Apply combined appUsers filter if any conditions exist
    if (Object.keys(appUsersConditions).length > 0) {
      where.appUsers = {
        some: appUsersConditions,
      };
    }

    // Department name filter
    if (department) {
      where.employments = {
        some: {
          is_active: true,
          department: {
            name: { contains: department, mode: "insensitive" },
          },
        },
      };
    }

    // Job Level filter
    if (jobLevel) {
      where.employments = {
        some: {
          is_active: true,
          jobTitle: {
            level: { contains: jobLevel, mode: "insensitive" },
          },
        },
      };
    }

    // Cost Sharing Status filter
    if (costSharingStatus) {
      const status = costSharingStatus as string;
      let statusFilter: any = {};

      if (status === "Fully Paid") {
        statusFilter = { in: ["CLEARED", "EXEMPTED"] };
      } else if (status === "Not Fully Paid") {
        statusFilter = { in: ["DECLARED", "ACTIVE"] };
      } else {
        // Fallback for direct status usage if needed
        statusFilter = status;
      }

      where.costSharing = {
        some: {
          status: statusFilter,
        },
      };
    }

    // Employment-based filters require nested filtering
    const employmentFilters: any = {
      is_active: true,
    };

    // Department filter (by ID)
    if (departmentId) {
      employmentFilters.department_id = parseInt(departmentId);
    }

    // Job title filter (by ID)
    if (jobTitleId) {
      employmentFilters.job_title_id = parseInt(jobTitleId);
    }

    // Employment type filter
    if (employmentType) {
      employmentFilters.employment_type = employmentType;
    }

    // Hire date range filter
    if (hireDateFrom || hireDateTo) {
      employmentFilters.start_date = {};
      if (hireDateFrom) {
        employmentFilters.start_date.gte = new Date(hireDateFrom);
      }
      if (hireDateTo) {
        employmentFilters.start_date.lte = new Date(hireDateTo);
      }
    }

    // Apply employment filters if any were specified
    if (
      departmentId ||
      jobTitleId ||
      employmentType ||
      hireDateFrom ||
      hireDateTo
    ) {
      where.employments = {
        some: {
          ...employmentFilters,
          ...(where.employments?.some || {}),
        },
      };
    }

    // Sorting
    let orderBy: any = { created_at: "desc" }; // Default sort
    if (sortBy) {
      if (sortBy === "name_asc") {
        orderBy = { full_name: "asc" };
      } else if (sortBy === "name_desc") {
        orderBy = { full_name: "desc" };
      } else if (sortBy === "newest") {
        orderBy = { created_at: "desc" };
      } else if (sortBy === "oldest") {
        orderBy = { created_at: "asc" };
      }
    }

    // Fetch employees with count
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          addresses: true,
          phones: true,
          appUsers: {
            select: {
              email: true,
              onboarding_status: true,
            },
            take: 1,
          },
          employments: {
            where: employmentFilters,
            include: {
              department: true,
              jobTitle: true,
              manager: {
                select: {
                  id: true,
                  full_name: true,
                  employments: {
                    where: { is_active: true },
                    select: {
                      jobTitle: { select: { title: true } },
                    },
                    take: 1,
                  },
                },
              },
              allowances: {
                include: {
                  allowanceType: true,
                },
              },
            },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // transform data
    const employeesData = employees.map((emp) => {
      const activeEmployment = emp.employments[0];
      const manager = activeEmployment?.manager;
      // Get manager's job title from their active employment
      const managerJobTitle =
        manager?.employments?.[0]?.jobTitle?.title || "N/A";
      const appUser = emp.appUsers[0];

      return {
        id: emp.id,
        employee_id: emp.id, // Add employee_id for frontend compatibility
        full_name: emp.full_name, // Add snake_case version
        fullName: emp.full_name, // Keep camelCase for backward compatibility
        firstName: emp.full_name.split(" ")[0],
        lastName: emp.full_name.split(" ").slice(1).join(" "),
        email: appUser?.email || "",
        onboarding_status: appUser?.onboarding_status || "N/A",
        phone: emp.phones.find((p) => p.is_primary)?.phone_number,
        department: activeEmployment?.department?.name,
        job_title: activeEmployment?.jobTitle?.title, // Add snake_case version
        jobTitle: activeEmployment?.jobTitle?.title, // Keep camelCase
        status: activeEmployment ? "Active" : "Inactive",
        manager: manager
          ? {
              id: manager.id,
              full_name: manager.full_name,
              jobTitle: managerJobTitle,
            }
          : null,
        managerId: manager?.id,
        joinedDate: activeEmployment?.start_date,
        addresses: emp.addresses,
        tin_number: emp.tin_number,
        pension_number: emp.pension_number,
      };
    });

    // Filter out System Admin from general list
    const filteredEmployees = employeesData.filter((e) => e.id !== "EMP-ADMIN");

    res.status(200).json({
      status: "success",
      message: "Employees fetched successfully",
      data: {
        employees: filteredEmployees,
        pagination: {
          total:
            filteredEmployees.length === employeesData.length
              ? total
              : total - 1,
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

export const fetchEmployee = async (
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

    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
      include: {
        addresses: true,
        phones: true,
        employments: {
          include: {
            department: true,
            jobTitle: true,
            manager: {
              select: {
                id: true,
                full_name: true,
                employments: {
                  where: { is_active: true },
                  select: {
                    jobTitle: { select: { title: true } },
                  },
                  take: 1,
                },
              },
            },
            allowances: {
              include: {
                allowanceType: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        },
        educations: {
          include: {
            educationLevel: true,
            fieldOfStudy: true,
            institution: true,
          },
        },
        licensesAndCertifications: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    const employeeForFrontend = {
      ...employee,
      educations: employee.educations.map((e) => ({
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
      })),
      employments: employee.employments.map((emp) => {
        const manager = emp.manager;
        const managerJobTitle =
          manager?.employments?.[0]?.jobTitle?.title || "N/A";

        return {
          ...emp,
          manager: manager
            ? {
                id: manager.id,
                full_name: manager.full_name,
                jobTitle: managerJobTitle,
              }
            : null,
        };
      }),
    };

    res.status(200).json({
      status: "success",
      message: "Employee fetched successfully",
      data: { employee: employeeForFrontend },
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (
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

    const {
      employee_id,
      full_name,
      gender,
      date_of_birth,
      tin_number,
      pension_number,
      place_of_work,
      // Employment Details
      department_id,
      job_title_id,
      employment_type,
      start_date,
      salary, // gross salary
    } = req.body;

    let finalEmployeeId = employee_id;

    if (!finalEmployeeId) {
      // Auto-generate employee_id
      const lastEmployee = await prisma.employee.findFirst({
        where: {
          company_id: companyId,
          id: { startsWith: "EMP-" },
        },
        orderBy: { created_at: "desc" },
        select: { id: true },
      });

      let nextId = 1;
      if (lastEmployee) {
        const parts = lastEmployee.id.split("-");
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num)) {
            nextId = num + 1;
          }
        }
      }
      finalEmployeeId = `EMP-${nextId}`;
    }

    // validation
    if (!finalEmployeeId || !full_name || !date_of_birth || !gender) {
      return res.status(400).json({
        status: "fail",
        message:
          "Please provide all required fields: full_name, date_of_birth, gender",
      });
    }

    // check for duplicates (using the generated or provided ID)
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: finalEmployeeId,
          company_id: companyId,
        },
      },
    });

    if (existingEmployee) {
      return res.status(400).json({
        status: "fail",
        message: "Employee ID already exists in this company",
      });
    }

    // check for duplicate TIN if provided
    if (tin_number) {
      const existingTin = await prisma.employee.findUnique({
        where: { tin_number },
      });

      if (existingTin) {
        return res.status(400).json({
          status: "fail",
          message: "TIN number already exists",
        });
      }
    }

    // Transaction: Create Employee + Employment
    const newEmployee = await prisma.$transaction(async (tx) => {
      // 1. Create Employee
      const emp = await tx.employee.create({
        data: {
          id: finalEmployeeId,
          company_id: companyId,
          full_name,
          gender,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
          tin_number,
          pension_number,
          place_of_work,
        },
      });

      // 2. Create Initial Employment Record if details provided
      if (
        department_id ||
        job_title_id ||
        employment_type ||
        start_date ||
        salary
      ) {
        await tx.employment.create({
          data: {
            employee_id: emp.id,
            company_id: companyId,
            department_id: department_id ? parseInt(department_id) : null,
            job_title_id: job_title_id ? parseInt(job_title_id) : null,
            employment_type: employment_type || "Full Time",
            start_date: start_date ? new Date(start_date) : new Date(),
            gross_salary: salary ? parseFloat(salary) : null,
            basic_salary: salary ? parseFloat(salary) : null, // Assuming basic = gross initially for simplicity, or 0
            is_active: true,
          },
        });
      }

      return emp;
    });

    res.status(201).json({
      status: "success",
      message: "Employee created successfully",
      data: {
        employee: newEmployee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (
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

    const {
      full_name,
      gender,
      date_of_birth,
      tin_number,
      pension_number,
      place_of_work,
    } = req.body;

    // check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // check for duplicate TIN if being updated
    if (tin_number && tin_number !== existingEmployee.tin_number) {
      const existingTin = await prisma.employee.findUnique({
        where: { tin_number },
      });

      if (existingTin) {
        return res.status(400).json({
          status: "fail",
          message: "TIN number already exists",
        });
      }
    }

    // update employee
    const updatedEmployee = await prisma.employee.update({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
      data: {
        ...(full_name && { full_name }),
        ...(gender && { gender }),
        ...(date_of_birth !== undefined && {
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        }),
        ...(tin_number !== undefined && { tin_number }),
        ...(pension_number !== undefined && { pension_number }),
        ...(place_of_work !== undefined && { place_of_work }),
      },
      include: {
        addresses: true,
        phones: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Employee updated successfully",
      data: {
        employee: updatedEmployee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (
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

    // check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
      include: {
        employments: true,
        appUsers: true,
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // check for active employments
    const activeEmployments = existingEmployee.employments.filter(
      (emp) => emp.is_active
    );

    if (activeEmployments.length > 0) {
      return res.status(400).json({
        status: "fail",
        message:
          "Cannot delete employee with active employment records. Please deactivate employments first.",
      });
    }

    // delete employee FYI cascade will handle related records
    await prisma.employee.delete({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Employee deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingEmployees = async (
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

    const pendingUsers = await prisma.appUser.findMany({
      where: {
        company_id: companyId,
        onboarding_status: {
          in: [OnboardingStatus.IN_PROGRESS],
        },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        company_id: true,
        employee_id: true,
        email: true,
        role_id: true,
        is_active: true,
        onboarding_status: true,
        created_at: true,
        updated_at: true,
        employee: {
          include: {
            addresses: true,
            phones: true,
            educations: {
              include: {
                educationLevel: true,
                fieldOfStudy: true,
                institution: true,
              },
            },
            employmentHistories: {
              include: {
                jobTitle: true,
              },
            },
            licensesAndCertifications: true,
            documents: true,
            employments: {
              include: {
                department: true,
                jobTitle: true,
                manager: {
                  select: {
                    id: true,
                    full_name: true,
                    employments: {
                      where: { is_active: true },
                      select: {
                        jobTitle: { select: { title: true } },
                      },
                      take: 1,
                    },
                  },
                },
                allowances: {
                  include: {
                    allowanceType: true,
                  },
                },
              },
            },
          },
        },
        role: true,
      },
    });

    const pendingUsersForFrontend = pendingUsers.map((u) => {
      if (!u.employee) return u;
      const employee = u.employee;
      const activeEmployment = employee.employments[0]; // Assuming most recent
      const manager = activeEmployment?.manager;
      const managerJobTitle =
        manager?.employments?.[0]?.jobTitle?.title || "N/A";

      return {
        ...u,
        employee: {
          ...employee,
          manager: manager
            ? {
                id: manager.id,
                full_name: manager.full_name,
                jobTitle: managerJobTitle,
              }
            : null,
          educations: employee.educations.map((e) => ({
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
          })),
          employmentHistories: employee.employmentHistories.map((h) => ({
            id: h.id,
            employee_id: h.employee_id,
            previousCompanyName: h.previous_company_name,
            jobTitle: h.jobTitle?.title ?? h.previous_job_title_text ?? null,
            previousLevel: h.previous_level ?? null,
            departmentName: h.department_name ?? null,
            startDate: h.start_date,
            endDate: h.end_date,
            isVerified: h.is_verified ?? false,
            notes: h.notes ?? null,
          })),
        },
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        pendingEmployees: pendingUsersForFrontend,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmittedEmployees = async (
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

    const submittedUsers = await prisma.appUser.findMany({
      where: {
        company_id: companyId,
        onboarding_status: OnboardingStatus.PENDING_APPROVAL,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        company_id: true,
        employee_id: true,
        email: true,
        role_id: true,
        is_active: true,
        onboarding_status: true,
        created_at: true,
        updated_at: true,
        employee: {
          include: {
            addresses: true,
            phones: true,
            educations: {
              include: {
                educationLevel: true,
                fieldOfStudy: true,
                institution: true,
              },
            },
            employmentHistories: {
              include: {
                jobTitle: true,
              },
            },
            licensesAndCertifications: true,
            documents: true,
            employments: {
              include: {
                department: true,
                jobTitle: true,
                manager: {
                  select: {
                    id: true,
                    full_name: true,
                    employments: {
                      where: { is_active: true },
                      select: {
                        jobTitle: { select: { title: true } },
                      },
                      take: 1,
                    },
                  },
                },
                allowances: {
                  include: {
                    allowanceType: true,
                  },
                },
              },
            },
          },
        },
        role: true,
      },
    });

    // The user didn't complain about single fetch, but let's fix the lists first.
    // Focusing on getSubmittedEmployees and getPendingEmployees which return lists.

    // ... getSubmittedEmployees ...

    const submittedUsersForFrontend = submittedUsers.map((u) => {
      if (!u.employee) return u;
      const employee = u.employee;
      const activeEmployment = employee.employments[0]; // Assuming most recent
      const manager = activeEmployment?.manager;
      const managerJobTitle =
        manager?.employments?.[0]?.jobTitle?.title || "N/A";

      return {
        ...u,
        employee: {
          ...employee,
          manager: manager
            ? {
                id: manager.id,
                full_name: manager.full_name,
                jobTitle: managerJobTitle,
              }
            : null,
          educations: employee.educations.map((e) => ({
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
          })),
          employmentHistories: employee.employmentHistories.map((h) => ({
            id: h.id,
            employee_id: h.employee_id,
            previousCompanyName: h.previous_company_name,
            jobTitle: h.jobTitle?.title ?? h.previous_job_title_text ?? null,
            previousLevel: h.previous_level ?? null,
            departmentName: h.department_name ?? null,
            startDate: h.start_date,
            endDate: h.end_date,
            isVerified: h.is_verified ?? false,
            notes: h.notes ?? null,
          })),
        },
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        submittedEmployees: submittedUsersForFrontend,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCompletedEmployees = async (
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

    const completedUsers = await prisma.appUser.findMany({
      where: {
        company_id: companyId,
        onboarding_status: OnboardingStatus.COMPLETED,
        is_active: true,
        role: {
          name: {
            notIn: [RoleNames.ADMIN, ...SUPERADMIN_VARIANTS],
          },
        },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        company_id: true,
        employee_id: true,
        email: true,
        role_id: true,
        is_active: true,
        onboarding_status: true,
        created_at: true,
        updated_at: true,
        employee: {
          include: {
            addresses: true,
            phones: true,
            educations: {
              include: {
                educationLevel: true,
                fieldOfStudy: true,
                institution: true,
              },
            },
            employmentHistories: {
              include: {
                jobTitle: true,
              },
            },
            licensesAndCertifications: true,
            documents: true,
            employments: {
              include: {
                department: true,
                jobTitle: true,
                manager: {
                  select: {
                    id: true,
                    full_name: true,
                    employments: {
                      where: { is_active: true },
                      select: {
                        jobTitle: { select: { title: true } },
                      },
                      take: 1,
                    },
                  },
                },
                allowances: {
                  include: {
                    allowanceType: true,
                  },
                },
              },
            },
          },
        },
        role: true,
      },
    });

    const completedUsersForFrontend = completedUsers.map((u) => {
      if (!u.employee) return u;
      const employee = u.employee;
      const activeEmployment = employee.employments[0]; // Assuming most recent
      const manager = activeEmployment?.manager;
      const managerJobTitle =
        manager?.employments?.[0]?.jobTitle?.title || "N/A";

      return {
        ...u,
        employee: {
          ...employee,
          manager: manager
            ? {
                id: manager.id,
                full_name: manager.full_name,
                jobTitle: managerJobTitle,
              }
            : null,
          educations: employee.educations.map((e) => ({
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
          })),
          employmentHistories: employee.employmentHistories.map((h) => ({
            id: h.id,
            employee_id: h.employee_id,
            previousCompanyName: h.previous_company_name,
            jobTitle: h.jobTitle?.title ?? h.previous_job_title_text ?? null,
            previousLevel: h.previous_level ?? null,
            departmentName: h.department_name ?? null,
            startDate: h.start_date,
            endDate: h.end_date,
            isVerified: h.is_verified ?? false,
            notes: h.notes ?? null,
          })),
        },
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        completedEmployees: completedUsersForFrontend,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const approveEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params; // user id (numeric) or employee_id (string)
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const numericId = Number(id);
    let user = Number.isFinite(numericId)
      ? await prisma.appUser.findFirst({
          where: { id: numericId, company_id: companyId },
        })
      : null;

    if (!user) {
      user = await prisma.appUser.findFirst({
        where: {
          company_id: companyId,
          employee_id: id,
        },
      });
    }

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (user.onboarding_status !== OnboardingStatus.PENDING_APPROVAL) {
      return res.status(400).json({
        status: "fail",
        message: "User is not in submitted status",
      });
    }

    const approvedUser = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.appUser.update({
        where: { id: user.id },
        data: {
          onboarding_status: OnboardingStatus.COMPLETED,
          is_active: true,
        },
        include: { employee: true },
      });

      if (updatedUser.employee_id) {
        await tx.employment.updateMany({
          where: {
            employee_id: updatedUser.employee_id,
            company_id: companyId,
          },
          data: { is_active: true },
        });

        await initializeLeaveBalancesForEmployee(
          companyId,
          updatedUser.employee_id,
          new Date(),
          tx
        );
      }

      return updatedUser;
    });

    if (approvedUser.employee_id) {
      const loginUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/login`;
      const employeeName = approvedUser.employee?.full_name || "Employee";

      const emailResult = await sendEmail({
        to: approvedUser.email,
        subject: "Your account has been approved",
        html: getOnboardingApprovedEmailHtml(employeeName, loginUrl),
      });

      if (!emailResult?.success) {
        console.error(
          "[Email] Approval email failed:",
          emailResult?.error || "Unknown error"
        );
      }
    }

    res.status(200).json({
      status: "success",
      message: "Employee approved successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const approveOnboarding = async (
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

    // Find the AppUser associated with this employee
    const appUser = await prisma.appUser.findFirst({
      where: { employee_id: id, company_id: companyId },
    });

    if (!appUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found for this employee",
      });
    }

    if (appUser.onboarding_status === OnboardingStatus.COMPLETED) {
      return res.status(400).json({
        status: "fail",
        message: "Onboarding is already completed",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.appUser.update({
        where: { id: appUser.id },
        data: {
          onboarding_status: OnboardingStatus.COMPLETED,
          is_active: true,
        },
        include: { employee: true },
      });

      await tx.employment.updateMany({
        where: {
          employee_id: id,
          company_id: companyId,
        },
        data: { is_active: true },
      });

      await initializeLeaveBalancesForEmployee(companyId, id, new Date(), tx);

      return updatedUser;
    });

    const loginUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/login`;
    const employeeName = result.employee?.full_name || "Employee";

    const emailResult = await sendEmail({
      to: result.email,
      subject: "Your account has been approved",
      html: getOnboardingApprovedEmailHtml(employeeName, loginUrl),
    });

    if (!emailResult?.success) {
      console.error(
        "[Email] Approval email failed:",
        emailResult?.error || "Unknown error"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Onboarding approved and leave balances initialized",
      data: {
        user: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employee_id = (req as any).user?.employee_id;

    if (!employee_id) {
      return res.status(404).json({
        status: "fail",
        message: "Employee profile not found for this user",
      });
    }

    // Reuse the fetchEmployee logic but forced to own ID
    req.params.id = employee_id;
    return fetchEmployeeDetail(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const assignManager = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params; // Employee ID to assign manager to
    const { manager_id } = req.body;
    const companyId = (req as any).user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    if (!manager_id) {
      return res.status(400).json({
        status: "fail",
        message: "Manager ID is required",
      });
    }

    // Verify manager exists and is in the same company
    const manager = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: manager_id,
          company_id: companyId,
        },
      },
    });

    if (!manager) {
      return res.status(404).json({
        status: "fail",
        message: "Manager not found in this company",
      });
    }

    // Update the active employment record
    const activeEmployment = await prisma.employment.findFirst({
      where: {
        employee_id: id,
        company_id: companyId,
        is_active: true,
      },
    });

    if (!activeEmployment) {
      return res.status(404).json({
        status: "fail",
        message: "Active employment record not found for this employee",
      });
    }

    const updatedEmployment = await prisma.employment.update({
      where: { id: activeEmployment.id },
      data: { manager_id },
    });

    res.status(200).json({
      status: "success",
      message: "Manager assigned successfully",
      data: {
        employment: updatedEmployment,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePersonalDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const companyId = (req as any).user?.company_id;

    if (!companyId) {
      return res
        .status(400)
        .json({ status: "fail", message: "Company ID missing" });
    }

    const {
      full_name,
      gender,
      date_of_birth,
      tin_number,
      pension_number,
      place_of_work,
      profile_picture,
      onboarding_status,
    } = req.body;

    const existing = await prisma.employee.findUnique({
      where: { id_company_id: { id, company_id: companyId } },
      include: { appUsers: true },
    });

    if (!existing)
      return res
        .status(404)
        .json({ status: "fail", message: "Employee not found" });

    // Check TIN uniqueness
    if (tin_number && tin_number !== existing.tin_number) {
      const dup = await prisma.employee.findUnique({ where: { tin_number } });
      if (dup)
        return res
          .status(400)
          .json({ status: "fail", message: "TIN already exists" });
    }

    const parsedDob = date_of_birth ? new Date(date_of_birth) : null;

    await prisma.$transaction(async (tx) => {
      // Update Core
      await tx.employee.update({
        where: { id_company_id: { id, company_id: companyId } },
        data: {
          full_name,
          gender,
          date_of_birth:
            parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : undefined,
          tin_number,
          pension_number,
          place_of_work,
        },
      });

      // Update AppUser (Profile Pic & Status)
      if (profile_picture !== undefined || onboarding_status) {
        if (existing.appUsers.length > 0) {
          await tx.appUser.updateMany({
            where: { employee_id: id, company_id: companyId },
            data: {
              ...(onboarding_status && { onboarding_status }),
              ...(profile_picture !== undefined && {
                profile_picture: profile_picture || null,
              }),
            },
          });
        }
      }
    });

    res
      .status(200)
      .json({ status: "success", message: "Personal details updated" });
  } catch (error) {
    next(error);
  }
};
export const fetchEmployeeDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
      include: {
        addresses: true,
        phones: true,
        appUsers: {
          select: {
            email: true,
            onboarding_status: true,
          },
        },
        employments: {
          include: {
            department: true,
            jobTitle: true,
            manager: {
              select: {
                id: true,
                full_name: true,
              },
            },
            allowances: {
              include: {
                allowanceType: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        },
        educations: {
          include: {
            educationLevel: true,
            fieldOfStudy: true,
            institution: true,
            // costSharings: true,
          },
        },
        licensesAndCertifications: true,
        documents: true,
        employmentHistories: true,
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
          orderBy: [
            { effective_date: "desc" },
            { event_date: "desc" },
            { id: "desc" },
          ],
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Process data to match frontend expectations
    const activeEmployment =
      (employee as any).employments.find((e: any) => e.is_active) ||
      (employee as any).employments[0];
    const onboarding_status =
      (employee as any).appUsers?.[0]?.onboarding_status || "PENDING";
    const profile_picture =
      (employee as any).appUsers?.[0]?.profile_picture || null;

    const formattedEmployee = {
      ...employee,
      onboarding_status,
      job_title: activeEmployment?.jobTitle?.title,
      job_level: activeEmployment?.jobTitle?.level,
      department: activeEmployment?.department?.name,
      employment_type: activeEmployment?.employment_type,
      start_date: activeEmployment?.start_date,
      // salary,
      profile_picture,
    };

    // Sign all files in the details
    // const signedEmployee = await signEmployeeFiles(formattedEmployee);
    const signedEmployee = formattedEmployee; // Direct return as per user request (Cloudinary URLs)

    res.status(200).json({
      status: "success",
      message: "Employee fetched successfully",
      data: { employee: signedEmployee },
    });
  } catch (error) {
    next(error);
  }
};
export const activateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    // check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: id,
          company_id: companyId,
        },
      },
      include: {
        appUsers: true,
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Perform Activation
    await prisma.$transaction(async (tx) => {
      // 1. Activate AppUser
      if (existingEmployee.appUsers.length > 0) {
        await tx.appUser.updateMany({
          where: { employee_id: id, company_id: companyId },
          data: { is_active: true },
        });
      }

      // 2. Activate Employment (Reactivate most recent? Or all?
      // Safe bet: Activate employments that were "recently" active or just all.
      // For simplicity/robustness in this context, we activate all associated employments
      // or maybe just the validation is they should be active.
      // Let's activate all for now to reverse the delete exactly.)
      await tx.employment.updateMany({
        where: { employee_id: id, company_id: companyId },
        data: { is_active: true },
      });
    });

    res.status(200).json({
      status: "success",
      message: "Employee activated successfully",
    });
  } catch (error) {
    next(error);
  }
};
