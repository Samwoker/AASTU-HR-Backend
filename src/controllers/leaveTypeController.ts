import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

/**
 * Get all leave types for the company
 */
export const getAllLeaveTypes = async (
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

    const leaveTypes = await prisma.leaveType.findMany({
      where: { company_id: companyId },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      status: "success",
      message: "Leave types fetched successfully",
      data: { leaveTypes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single leave type by ID
 */
export const getLeaveTypeById = async (
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

    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
    });

    if (!leaveType) {
      return res.status(404).json({
        status: "fail",
        message: "Leave type not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Leave type fetched successfully",
      data: { leaveType },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new leave type
 */
export const createLeaveType = async (
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
      name,
      code,
      default_allowance_days,
      incremental_days_per_year,
      max_accrual_limit,
      is_carry_over_allowed,
      carry_over_expiry_months,
      applicable_gender,
      requires_attachment,
      is_paid,
      incremental_period_years,
      is_calendar_days,
    } = req.body;

    // Validation
    if (!name || !code || default_allowance_days === undefined) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide name, code, and default_allowance_days",
      });
    }

    // Check for duplicate code
    const existingType = await prisma.leaveType.findUnique({
      where: {
        company_id_code: {
          company_id: companyId,
          code: code.toUpperCase(),
        },
      },
    });

    if (existingType) {
      return res.status(400).json({
        status: "fail",
        message: "Leave type code already exists",
      });
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        company_id: companyId,
        name,
        code: code.toUpperCase(),
        default_allowance_days: Number(default_allowance_days),
        incremental_days_per_year: incremental_days_per_year
          ? Number(incremental_days_per_year)
          : 0,
        max_accrual_limit: max_accrual_limit ? Number(max_accrual_limit) : null,
        is_carry_over_allowed: is_carry_over_allowed ?? false,
        carry_over_expiry_months: carry_over_expiry_months
          ? Number(carry_over_expiry_months)
          : null,
        applicable_gender: applicable_gender || "All",
        requires_attachment: requires_attachment ?? false,
        is_paid: is_paid ?? true,
        incremental_period_years: incremental_period_years
          ? Number(incremental_period_years)
          : 2,
        is_calendar_days: is_calendar_days ?? false,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Leave type created successfully",
      data: { leaveType },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a leave type
 */
export const updateLeaveType = async (
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

    // Check if leave type exists
    const existingType = await prisma.leaveType.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
    });

    if (!existingType) {
      return res.status(404).json({
        status: "fail",
        message: "Leave type not found",
      });
    }

    const {
      name,
      code,
      default_allowance_days,
      incremental_days_per_year,
      max_accrual_limit,
      is_carry_over_allowed,
      carry_over_expiry_months,
      applicable_gender,
      requires_attachment,
      is_paid,
      incremental_period_years,
      is_calendar_days,
    } = req.body;

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== existingType.code) {
      const duplicateCode = await prisma.leaveType.findUnique({
        where: {
          company_id_code: {
            company_id: companyId,
            code: code.toUpperCase(),
          },
        },
      });

      if (duplicateCode) {
        return res.status(400).json({
          status: "fail",
          message: "Leave type code already exists",
        });
      }
    }

    const leaveType = await prisma.leaveType.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(default_allowance_days !== undefined && {
          default_allowance_days: Number(default_allowance_days),
        }),
        ...(incremental_days_per_year !== undefined && {
          incremental_days_per_year: Number(incremental_days_per_year),
        }),
        ...(max_accrual_limit !== undefined && {
          max_accrual_limit: max_accrual_limit
            ? Number(max_accrual_limit)
            : null,
        }),
        ...(is_carry_over_allowed !== undefined && { is_carry_over_allowed }),
        ...(carry_over_expiry_months !== undefined && {
          carry_over_expiry_months: carry_over_expiry_months
            ? Number(carry_over_expiry_months)
            : null,
        }),
        ...(applicable_gender !== undefined && { applicable_gender }),
        ...(requires_attachment !== undefined && { requires_attachment }),
        ...(is_paid !== undefined && { is_paid }),
        ...(incremental_period_years !== undefined && {
          incremental_period_years: Number(incremental_period_years),
        }),
        ...(is_calendar_days !== undefined && { is_calendar_days }),
      },
    });

    res.status(200).json({
      status: "success",
      message: "Leave type updated successfully",
      data: { leaveType },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a leave type
 */
export const deleteLeaveType = async (
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

    // Check if leave type exists
    const existingType = await prisma.leaveType.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
    });

    if (!existingType) {
      return res.status(404).json({
        status: "fail",
        message: "Leave type not found",
      });
    }

    // Check if there are any leave applications using this type
    const applicationsCount = await prisma.leaveApplication.count({
      where: { leave_type_id: Number(id) },
    });

    if (applicationsCount > 0) {
      return res.status(400).json({
        status: "fail",
        message: `Cannot delete leave type. ${applicationsCount} leave application(s) are using this type.`,
      });
    }

    await prisma.leaveType.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({
      status: "success",
      message: "Leave type deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default leave types for a company
 */
export const seedDefaultLeaveTypes = async (
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

    // Check if leave types already exist
    const existingTypes = await prisma.leaveType.count({
      where: { company_id: companyId },
    });

    if (existingTypes > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Leave types already exist for this company",
      });
    }

    // Default leave types based on Ethiopian Labor Law and business requirements
    const defaultTypes = [
      {
        company_id: companyId,
        name: "Annual Leave",
        code: "ANNUAL",
        default_allowance_days: 16, // 16 working days for first year
        incremental_days_per_year: 1, // +1 day for every 2 years
        incremental_period_years: 2, // Every 2 years
        max_accrual_limit: null,
        is_carry_over_allowed: true,
        carry_over_expiry_months: 24, // Maximum postponement: 2 years
        applicable_gender: "All",
        requires_attachment: false,
        is_paid: true,
        is_calendar_days: false,
      },
      {
        company_id: companyId,
        name: "Marriage Leave",
        code: "MARRIAGE",
        default_allowance_days: 3, // 3 working days
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "All",
        requires_attachment: true, // Marriage certificate
        is_paid: true,
        is_calendar_days: false,
      },
      {
        company_id: companyId,
        name: "Maternity Leave (Pre-natal)",
        code: "MATERNITY_PRE",
        default_allowance_days: 30, // 30 consecutive days before childbirth
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "Female",
        requires_attachment: true, // Medical certificate
        is_paid: true,
        is_calendar_days: true, // Consecutive calendar days
      },
      {
        company_id: companyId,
        name: "Maternity Leave (Post-natal)",
        code: "MATERNITY_POST",
        default_allowance_days: 90, // 90 consecutive days after childbirth
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "Female",
        requires_attachment: true, // Medical certificate
        is_paid: true,
        is_calendar_days: true, // Consecutive calendar days
      },
      {
        company_id: companyId,
        name: "Paternity Leave",
        code: "PATERNITY",
        default_allowance_days: 3, // 3 consecutive days (not 5)
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "Male",
        requires_attachment: true, // Birth certificate
        is_paid: true,
        is_calendar_days: true, // Consecutive calendar days
      },
      {
        company_id: companyId,
        name: "Mourning/Bereavement Leave",
        code: "MOURNING",
        default_allowance_days: 3, // 3 working days
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "All",
        requires_attachment: false,
        is_paid: true,
        is_calendar_days: false,
      },
      {
        company_id: companyId,
        name: "Sick Leave",
        code: "SICK",
        default_allowance_days: 180, // 6 months total (30d@100%, 60d@50%, 90d@unpaid)
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "All",
        requires_attachment: true, // Medical certificate required
        is_paid: true, // Payment tiers handled in payroll
        is_calendar_days: false,
      },
      {
        company_id: companyId,
        name: "Unpaid Leave",
        code: "UNPAID",
        default_allowance_days: 5, // Max 5 consecutive days per request
        incremental_days_per_year: 0,
        incremental_period_years: 1,
        max_accrual_limit: null,
        is_carry_over_allowed: false,
        carry_over_expiry_months: null,
        applicable_gender: "All",
        requires_attachment: false,
        is_paid: false,
        is_calendar_days: false,
      },
    ];

    const leaveTypes = await prisma.leaveType.createMany({
      data: defaultTypes,
    });

    res.status(201).json({
      status: "success",
      message: `${leaveTypes.count} default leave types created successfully`,
      data: {
        count: leaveTypes.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leave types applicable to an employee (based on gender)
 */
export const getApplicableLeaveTypes = async (
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

    // Normalize employee gender (handle "M"/"Male" and "F"/"Female")
    const normalizeGender = (gender: string | null | undefined): string | null => {
      if (!gender) return null;
      const normalized = gender.trim().toUpperCase();
      if (normalized === "M" || normalized === "MALE") return "Male";
      if (normalized === "F" || normalized === "FEMALE") return "Female";
      return gender; // Return as-is if it's already "Male" or "Female"
    };

    // Get employee's gender
    let employeeGender: string | null = null;
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: {
          id_company_id: {
            id: employeeId,
            company_id: companyId,
          },
        },
        select: { gender: true },
      });

      if (employee?.gender) {
        employeeGender = normalizeGender(employee.gender);
      }
    }

    // Get applicable leave types
    // If gender is not set, show all types. If set, show "All" + matching gender types
    const leaveTypes = await prisma.leaveType.findMany({
      where: {
        company_id: companyId,
        OR: employeeGender
          ? [
              { applicable_gender: "All" },
              { applicable_gender: employeeGender },
            ]
          : [
              // If gender is not set, show all leave types
              { applicable_gender: "All" },
              { applicable_gender: "Male" },
              { applicable_gender: "Female" },
            ],
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      status: "success",
      message: "Applicable leave types fetched successfully",
      data: { leaveTypes },
    });
  } catch (error) {
    next(error);
  }
};

