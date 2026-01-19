import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";
import {
  calculateLeaveEntitlement,
  calculateYearsOfService,
  getFiscalYear,
  calculateExpiryDate,
  calculateAccruedBalance,
  calculateLeaveCashValue,
  AccruedBalanceResult,
} from "src/utils/leaveUtils";
import { sendEmail } from "src/utils/email";

const round2 = (value: number): number => Number(value.toFixed(2));
const toNum = (value: unknown): number => Number(value ?? 0);

const computeEffectiveLeaveBalance = (
  balance: any,
  hireDate: Date | null,
  settings: any
): {
  total_entitlement: number;
  remaining_days: number;
  used_days: number;
  pending_days: number;
} => {
  const usedDays = toNum(balance?.used_days);
  const pendingDays = toNum(balance?.pending_days);
  const carriedOverDays = toNum(balance?.total_entitlement);

  const isAnnualLeave = balance?.leaveType?.code === "ANNUAL";

  if (isAnnualLeave && hireDate) {
    const baseDays =
      toNum(balance?.leaveType?.default_allowance_days) ||
      toNum(settings?.annual_leave_base_days) ||
      16;

    const incrementPeriodYears =
      balance?.leaveType?.incremental_period_years ??
      settings?.increment_period_years ??
      2;

    const incrementAmount =
      balance?.leaveType?.incremental_days_per_year ??
      settings?.increment_amount ??
      1;

    const divisor = settings?.accrual_divisor ?? 365;
    const fiscalYearStartMonth = settings?.fiscal_year_start_month ?? 1;
    const accrualBasis = settings?.accrual_basis ?? "ANNIVERSARY";
    const maxCap =
      balance?.leaveType?.max_accrual_limit ??
      settings?.max_annual_leave_cap ??
      null;

    const accrualDetails = calculateAccruedBalance(
      hireDate,
      new Date(),
      baseDays,
      divisor,
      fiscalYearStartMonth,
      incrementPeriodYears,
      incrementAmount,
      maxCap,
      accrualBasis
    );

    const availableEntitlement = round2(
      carriedOverDays + toNum(accrualDetails.accruedDays)
    );

    return {
      total_entitlement: availableEntitlement,
      used_days: round2(usedDays),
      pending_days: round2(pendingDays),
      remaining_days: round2(
        Math.max(0, availableEntitlement - usedDays - pendingDays)
      ),
    };
  }

  const availableEntitlement = round2(carriedOverDays);
  return {
    total_entitlement: availableEntitlement,
    used_days: round2(usedDays),
    pending_days: round2(pendingDays),
    remaining_days: round2(
      Math.max(0, availableEntitlement - usedDays - pendingDays)
    ),
  };
};

/**
 * Get leave balance for the current employee
 *
 * IMPORTANT: For Annual Leave, uses GRADUAL ACCRUAL based on company settings.
 * Daily accrual formula: daily_leave = annual_entitlement / accrual_divisor
 *
 * Other leave types use standard entitlement (full amount available when eligible)
 */
export const getMyLeaveBalance = async (
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

    const fiscalYear = await getFiscalYear(companyId);

    // Get company leave settings for accrual configuration
    const leaveSettings = await prisma.leaveSettings.findUnique({
      where: { company_id: companyId },
    });

    // Cast to any to handle type definition lag
    const settings = leaveSettings as any;

    // Accrual configuration (with defaults)
    const accrualConfig = {
      baseDays: settings?.annual_leave_base_days ?? 16,
      divisor: settings?.accrual_divisor ?? 365,
      fiscalYearStartMonth: settings?.fiscal_year_start_month ?? 1,
      accrualBasis: settings?.accrual_basis ?? "ANNIVERSARY",
      incrementPeriodYears: settings?.increment_period_years ?? 2,
      incrementAmount: settings?.increment_amount ?? 1,
      maxCap: settings?.max_annual_leave_cap ?? null,
      accrualFrequency: settings?.accrual_frequency ?? "DAILY",
      enableEncashment: settings?.enable_encashment ?? false,
      encashmentDivisor: settings?.encashment_salary_divisor ?? 30,
      maxEncashmentDays: settings?.max_encashment_days ?? null,
    };

    // Get employee details for entitlement calculation
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
            gross_salary: true,
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

    // Normalize employee gender (handle "M"/"Male" and "F"/"Female")
    const normalizeGender = (
      gender: string | null | undefined
    ): string | null => {
      if (!gender) return null;
      const normalized = gender.trim().toUpperCase();
      if (normalized === "M" || normalized === "MALE") return "Male";
      if (normalized === "F" || normalized === "FEMALE") return "Female";
      return gender;
    };

    // Get all leave types for the company
    const employeeGender = normalizeGender(employee.gender);
    const leaveTypes = await prisma.leaveType.findMany({
      where: {
        company_id: companyId,
        OR: employeeGender
          ? [
              { applicable_gender: "All" },
              { applicable_gender: employeeGender },
            ]
          : [
              { applicable_gender: "All" },
              { applicable_gender: "Male" },
              { applicable_gender: "Female" },
            ],
      },
      orderBy: { name: "asc" },
    });

    // Get existing balances
    const existingBalances = await prisma.leaveBalance.findMany({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        fiscal_year: fiscalYear,
      },
      include: {
        leaveType: true,
      },
    });

    const balanceMap = new Map(
      existingBalances.map((b) => [b.leave_type_id, b])
    );

    // Get employee hire date and salary for calculations
    const hireDate = employee.employments[0]?.start_date ?? new Date();
    const monthlySalary = Number(employee.employments[0]?.gross_salary ?? 0);
    const today = new Date();

    // Build balance list with accrual calculations
    const allBalances = await Promise.all(
      leaveTypes.map(async (leaveType) => {
        let balance = balanceMap.get(leaveType.id);
        let entitlement: number;
        let accrualDetails: AccruedBalanceResult | null = null;

        // Check if this is annual leave (uses gradual accrual)
        const isAnnualLeave = leaveType.code === "ANNUAL";

        if (isAnnualLeave) {
          // Use gradual accrual for annual leave
          // Prioritize specific LeaveType settings over global LeaveSettings
          const baseDays =
            leaveType.default_allowance_days || accrualConfig.baseDays;
          const incrementPeriod =
            leaveType.incremental_period_years ??
            accrualConfig.incrementPeriodYears;
          const incrementAmount =
            leaveType.incremental_days_per_year ??
            accrualConfig.incrementAmount;

          accrualDetails = calculateAccruedBalance(
            hireDate,
            today,
            baseDays,
            accrualConfig.divisor,
            accrualConfig.fiscalYearStartMonth,
            incrementPeriod,
            incrementAmount,
            accrualConfig.maxCap,
            accrualConfig.accrualBasis
          );

          // For annual leave, entitlement is what has been ACCRUED (not full year amount)
          entitlement = accrualDetails.accruedDays;
        } else {
          // For other leave types, use standard calculation (full entitlement)
          const yearsOfService = employee.employments[0]
            ? calculateYearsOfService(employee.employments[0].start_date)
            : 0;

          entitlement = calculateLeaveEntitlement(
            leaveType.default_allowance_days,
            leaveType.incremental_days_per_year || 0,
            yearsOfService,
            leaveType.max_accrual_limit
          );
        }

        const expiryDate = leaveType.carry_over_expiry_months
          ? calculateExpiryDate(fiscalYear, leaveType.carry_over_expiry_months)
          : null;

        // Create or update balance
        if (!balance) {
          try {
            const usedDays = 0;
            const pendingDays = 0;
            const remainingDays = entitlement - usedDays;

            balance = await prisma.leaveBalance.create({
              data: {
                employee_id: employeeId,
                company_id: companyId,
                leave_type_id: leaveType.id,
                fiscal_year: fiscalYear,
                total_entitlement: entitlement,
                used_days: usedDays,
                pending_days: pendingDays,
                remaining_days: remainingDays,
                expiry_date: expiryDate,
              },
              include: {
                leaveType: true,
              },
            });
          } catch (error: any) {
            if (error?.code === "P2002") {
              const fetchedBalance = await prisma.leaveBalance.findUnique({
                where: {
                  employee_id_leave_type_id_fiscal_year: {
                    employee_id: employeeId,
                    leave_type_id: leaveType.id,
                    fiscal_year: fiscalYear,
                  },
                },
                include: {
                  leaveType: true,
                },
              });

              if (!fetchedBalance) {
                throw new Error(
                  `Failed to fetch leave balance for employee ${employeeId}, leave type ${leaveType.id}`
                );
              }
              balance = fetchedBalance;
            } else {
              throw error;
            }
          }
        }

        // Calculate used and remaining for response
        const usedDays = Number(balance.used_days ?? 0);
        const pendingDays = Number(balance.pending_days ?? 0);

        const round2 = (value: number): number => Number(value.toFixed(2));

        // For annual leave with accrual:
        // Remaining = (Carried Over + Accrued Current Year) - Used - Pending
        // balanced.total_entitlement is treated as "Carried Over" or "Opening Balance"

        const carriedOverDays = Number(balance.total_entitlement);
        const accruedCurrentYear =
          isAnnualLeave && accrualDetails ? accrualDetails.accruedDays : 0;

        const availableEntitlement =
          isAnnualLeave && accrualDetails
            ? carriedOverDays + accruedCurrentYear
            : Number(balance.total_entitlement);

        const roundedAvailableEntitlement = round2(availableEntitlement);
        const remainingDays = round2(
          Math.max(0, roundedAvailableEntitlement - usedDays - pendingDays)
        );

        // Calculate cash-out value if encashment is enabled
        let cashOutInfo = null;
        if (
          accrualConfig.enableEncashment &&
          isAnnualLeave &&
          monthlySalary > 0
        ) {
          const cashOut = calculateLeaveCashValue(
            remainingDays,
            monthlySalary,
            accrualConfig.encashmentDivisor,
            accrualConfig.maxEncashmentDays,
            (settings?.encashment_rounding as "ROUND" | "FLOOR" | "CEIL") ??
              "ROUND"
          );
          cashOutInfo = {
            eligible_days: cashOut.eligibleDays,
            daily_rate: cashOut.dailyRate,
            cash_value: cashOut.roundedValue,
            currency: "ETB",
          };
        }

        // Build enhanced balance response
        return {
          ...balance,
          // Override with calculated values (Accrued + Carried Over)
          total_entitlement: roundedAvailableEntitlement, // This is now the EFFECTIVE total entitlement
          accrued_entitlement: roundedAvailableEntitlement, // Alias
          annual_entitlement:
            isAnnualLeave && accrualDetails
              ? accrualDetails.annualEntitlement
              : Number(balance.total_entitlement),
          used_days: usedDays,
          pending_days: pendingDays,
          remaining_days: remainingDays,
          // Accrual details (only for annual leave)
          accrual_details:
            isAnnualLeave && accrualDetails
              ? {
                  is_gradual_accrual: true,
                  daily_rate: accrualDetails.dailyRate,
                  days_worked: accrualDetails.daysInFiscalYear,
                  base_entitlement:
                    accrualDetails.annualEntitlement -
                    accrualDetails.tenureBonusDays,
                  tenure_bonus_days: accrualDetails.tenureBonusDays,
                  accrued_days_current_year: accruedCurrentYear,
                  carried_over_days: carriedOverDays,
                  fiscal_year_start: accrualDetails.fiscalYearStart,
                }
              : null,
          // Cash-out info (if enabled)
          cash_out: cashOutInfo,
        };
      })
    );

    res.status(200).json({
      status: "success",
      message: "Leave balance fetched successfully",
      data: {
        fiscal_year: fiscalYear,
        accrual_settings: {
          base_days: accrualConfig.baseDays,
          divisor: accrualConfig.divisor,
          frequency: accrualConfig.accrualFrequency,
          increment_period_years: accrualConfig.incrementPeriodYears,
          increment_amount: accrualConfig.incrementAmount,
          max_cap: accrualConfig.maxCap,
          encashment_enabled: accrualConfig.enableEncashment,
        },
        balances: allBalances,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leave balance for a specific employee (Admin/HR)
 */
export const getEmployeeLeaveBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const year = req.query.year
      ? Number(req.query.year)
      : await getFiscalYear(companyId);

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
      select: {
        id: true,
        full_name: true,
        employments: {
          where: { is_active: true },
          select: {
            start_date: true,
            department: { select: { name: true } },
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

    const leaveSettings = await prisma.leaveSettings.findUnique({
      where: { company_id: companyId },
    });
    const settings = leaveSettings as any;

    const hireDate = employee.employments[0]?.start_date ?? null;

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        fiscal_year: year,
      },
      include: {
        leaveType: true,
      },
      orderBy: {
        leaveType: { name: "asc" },
      },
    });

    const normalizedBalances = balances.map((b) => ({
      ...b,
      ...computeEffectiveLeaveBalance(b, hireDate, settings),
    }));

    res.status(200).json({
      status: "success",
      message: "Leave balance fetched successfully",
      data: {
        employee,
        fiscal_year: year,
        balances: normalizedBalances,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all employees' leave balances (Admin/HR dashboard)
 */
export const getAllEmployeesLeaveBalance = async (
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

    const year = req.query.year
      ? Number(req.query.year)
      : await getFiscalYear(companyId);

    const leaveSettings = await prisma.leaveSettings.findUnique({
      where: { company_id: companyId },
    });
    const settings = leaveSettings as any;

    const leaveTypeId = req.query.leave_type_id as string;
    const departmentId = req.query.department_id as string;

    // Build where clause
    const where: any = {
      company_id: companyId,
      employments: {
        some: { is_active: true },
      },
    };

    if (departmentId) {
      where.employments.some.department_id = Number(departmentId);
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { full_name: "asc" },
        select: {
          id: true,
          full_name: true,
          gender: true,
          employments: {
            where: { is_active: true },
            select: {
              start_date: true,
              gross_salary: true,
              department: { select: { id: true, name: true } },
              jobTitle: { select: { title: true, level: true } },
            },
            take: 1,
          },
          leaveBalances: {
            where: {
              fiscal_year: year,
              ...(leaveTypeId && { leave_type_id: Number(leaveTypeId) }),
            },
            include: {
              leaveType: true,
            },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    const normalizedEmployees = employees.map((employee) => {
      const hireDate = employee.employments[0]?.start_date ?? null;
      const normalizedBalances = (employee.leaveBalances ?? []).map(
        (b: any) => ({
          ...b,
          ...computeEffectiveLeaveBalance(b, hireDate, settings),
        })
      );

      return {
        ...employee,
        leaveBalances: normalizedBalances,
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      message: "Employees leave balances fetched successfully",
      data: {
        fiscal_year: year,
        employees: normalizedEmployees,
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
 * Allocate leave for a specific employee for the year
 */
export const allocateLeaveForEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const { fiscal_year, leave_type_id, total_entitlement, expiry_date } =
      req.body;

    // Get employee and their employment details
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
          select: { start_date: true },
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

    // Get leave type
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

    const targetYear = fiscal_year || (await getFiscalYear(companyId));

    const round2 = (value: number): number => Number(value.toFixed(2));

    // Calculate entitlement if not provided
    let entitlement = total_entitlement;
    if (!entitlement && employee.employments[0]) {
      const yearsOfService = calculateYearsOfService(
        employee.employments[0].start_date
      );
      entitlement = calculateLeaveEntitlement(
        leaveType.default_allowance_days,
        leaveType.incremental_days_per_year || 0,
        yearsOfService,
        leaveType.max_accrual_limit
      );
    }

    // Calculate expiry date if not provided
    let expiryDateValue = expiry_date ? new Date(expiry_date) : null;
    if (!expiryDateValue && leaveType.carry_over_expiry_months) {
      expiryDateValue = calculateExpiryDate(
        targetYear,
        leaveType.carry_over_expiry_months
      );
    }

    // Keep remaining_days consistent even when updating an existing balance.
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: {
        employee_id_leave_type_id_fiscal_year: {
          employee_id: employeeId,
          leave_type_id: Number(leave_type_id),
          fiscal_year: targetYear,
        },
      },
      select: {
        used_days: true,
        pending_days: true,
      },
    });

    const usedDays = Number(existingBalance?.used_days ?? 0);
    const pendingDays = Number(existingBalance?.pending_days ?? 0);
    const remainingDays = Math.max(
      0,
      round2(Number(entitlement) - usedDays - pendingDays)
    );

    // Upsert the leave balance
    const balance = await prisma.leaveBalance.upsert({
      where: {
        employee_id_leave_type_id_fiscal_year: {
          employee_id: employeeId,
          leave_type_id: Number(leave_type_id),
          fiscal_year: targetYear,
        },
      },
      update: {
        total_entitlement: entitlement,
        remaining_days: remainingDays,
        expiry_date: expiryDateValue,
        updated_at: new Date(),
      },
      create: {
        employee_id: employeeId,
        company_id: companyId,
        leave_type_id: Number(leave_type_id),
        fiscal_year: targetYear,
        total_entitlement: entitlement,
        used_days: 0,
        pending_days: 0,
        remaining_days: round2(Number(entitlement)),
        expiry_date: expiryDateValue,
      },
      include: {
        leaveType: true,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Leave allocated successfully",
      data: { balance },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk allocate leave for all employees for the year
 */
export const bulkAllocateLeave = async (
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

    const { fiscal_year, leave_type_id } = req.body;

    if (!leave_type_id) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide leave_type_id",
      });
    }

    // Get leave type
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

    const targetYear = fiscal_year || (await getFiscalYear(companyId));

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: {
        company_id: companyId,
        // Check gender eligibility
        ...(leaveType.applicable_gender !== "All" && {
          gender: leaveType.applicable_gender,
        }),
        employments: {
          some: { is_active: true },
        },
      },
      include: {
        employments: {
          where: { is_active: true },
          select: { start_date: true },
          take: 1,
        },
      },
    });

    let created = 0;
    let updated = 0;

    for (const employee of employees) {
      if (!employee.employments[0]) continue;

      const yearsOfService = calculateYearsOfService(
        employee.employments[0].start_date
      );

      const entitlement = calculateLeaveEntitlement(
        leaveType.default_allowance_days,
        leaveType.incremental_days_per_year || 0,
        yearsOfService,
        leaveType.max_accrual_limit
      );

      const expiryDate = leaveType.carry_over_expiry_months
        ? calculateExpiryDate(targetYear, leaveType.carry_over_expiry_months)
        : null;

      // Check if balance exists
      const existing = await prisma.leaveBalance.findUnique({
        where: {
          employee_id_leave_type_id_fiscal_year: {
            employee_id: employee.id,
            leave_type_id: Number(leave_type_id),
            fiscal_year: targetYear,
          },
        },
      });

      if (existing) {
        await prisma.leaveBalance.update({
          where: { id: existing.id },
          data: {
            total_entitlement: entitlement,
            expiry_date: expiryDate,
            updated_at: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.leaveBalance.create({
          data: {
            employee_id: employee.id,
            company_id: companyId,
            leave_type_id: Number(leave_type_id),
            fiscal_year: targetYear,
            total_entitlement: entitlement,
            used_days: 0,
            pending_days: 0,
            expiry_date: expiryDate,
          },
        });
        created++;
      }
    }

    res.status(200).json({
      status: "success",
      message: `Leave allocated for ${employees.length} employees (${created} created, ${updated} updated)`,
      data: {
        total_employees: employees.length,
        created,
        updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust leave balance manually (Admin)
 */
export const adjustLeaveBalance = async (
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

    const { adjustment_days, adjustment_type, reason } = req.body;

    if (adjustment_days === undefined || !adjustment_type) {
      return res.status(400).json({
        status: "fail",
        message:
          "Please provide adjustment_days and adjustment_type (add/subtract)",
      });
    }

    // Get the balance
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        id: Number(id),
        company_id: companyId,
      },
    });

    if (!balance) {
      return res.status(404).json({
        status: "fail",
        message: "Leave balance not found",
      });
    }

    const currentEntitlement = Number(balance.total_entitlement);
    const adjustmentValue = Number(adjustment_days);

    const round2 = (value: number): number => Number(value.toFixed(2));

    let newEntitlement: number;
    if (adjustment_type === "add") {
      newEntitlement = currentEntitlement + adjustmentValue;
    } else if (adjustment_type === "subtract") {
      newEntitlement = currentEntitlement - adjustmentValue;
      if (newEntitlement < Number(balance.used_days)) {
        return res.status(400).json({
          status: "fail",
          message: "Cannot reduce entitlement below used days",
        });
      }
    } else {
      return res.status(400).json({
        status: "fail",
        message: "adjustment_type must be 'add' or 'subtract'",
      });
    }

    const updatedBalance = await prisma.leaveBalance.update({
      where: { id: Number(id) },
      data: {
        total_entitlement: round2(newEntitlement),
        remaining_days: round2(
          Math.max(
            0,
            newEntitlement -
              Number(balance.used_days ?? 0) -
              Number(balance.pending_days ?? 0)
          )
        ),
        updated_at: new Date(),
      },
      include: {
        leaveType: true,
        employee: {
          select: { id: true, full_name: true },
        },
      },
    });

    // TODO: Log the adjustment with reason

    res.status(200).json({
      status: "success",
      message: `Leave balance adjusted. ${
        adjustment_type === "add" ? "Added" : "Subtracted"
      } ${adjustmentValue} days`,
      data: { balance: updatedBalance },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leave balances that are about to expire (2-year rule notification)
 */
export const getExpiringLeaveBalances = async (
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

    // Days before expiry to warn (default 30 days)
    const daysBeforeExpiry = parseInt(req.query.days as string) || 30;

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);

    const expiringBalances = await prisma.leaveBalance.findMany({
      where: {
        company_id: companyId,
        expiry_date: {
          lte: warningDate,
          gte: new Date(),
        },
        // Only show balances with remaining days
        remaining_days: { gt: 0 },
      },
      include: {
        employee: {
          select: { id: true, full_name: true },
        },
        leaveType: {
          select: { name: true, code: true },
        },
      },
      orderBy: { expiry_date: "asc" },
    });

    res.status(200).json({
      status: "success",
      message: "Expiring leave balances fetched successfully",
      data: { balances: expiringBalances },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Carry over unused leave from previous year
 */
export const carryOverLeave = async (
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

    const { from_year, to_year, leave_type_id } = req.body;

    if (!from_year || !to_year || !leave_type_id) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide from_year, to_year, and leave_type_id",
      });
    }

    // Get leave type to check if carry over is allowed
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

    if (!leaveType.is_carry_over_allowed) {
      return res.status(400).json({
        status: "fail",
        message: "Carry over is not allowed for this leave type",
      });
    }

    // Get balances from previous year with remaining days
    const previousBalances = await prisma.leaveBalance.findMany({
      where: {
        company_id: companyId,
        leave_type_id: Number(leave_type_id),
        fiscal_year: Number(from_year),
        remaining_days: { gt: 0 },
        OR: [{ expiry_date: null }, { expiry_date: { gt: new Date() } }],
      },
    });

    let carriedOver = 0;

    for (const balance of previousBalances) {
      const remainingDays = Number(balance.remaining_days);

      // Add to next year's balance
      await prisma.leaveBalance.upsert({
        where: {
          employee_id_leave_type_id_fiscal_year: {
            employee_id: balance.employee_id,
            leave_type_id: Number(leave_type_id),
            fiscal_year: Number(to_year),
          },
        },
        update: {
          total_entitlement: {
            increment: remainingDays,
          },
        },
        create: {
          employee_id: balance.employee_id,
          company_id: companyId,
          leave_type_id: Number(leave_type_id),
          fiscal_year: Number(to_year),
          total_entitlement: remainingDays,
          used_days: 0,
          pending_days: 0,
          expiry_date: balance.expiry_date,
        },
      });

      carriedOver++;
    }

    res.status(200).json({
      status: "success",
      message: `Carried over leave for ${carriedOver} employees from ${from_year} to ${to_year}`,
      data: { carried_over_count: carriedOver },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Notify employees with expiring leave balances
 * Triggered manually or by scheduler
 */
export const notifyExpiringLeaves = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days_threshold = 30 } = req.body;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + Number(days_threshold));

    const today = new Date();

    // Find balances expiring within the threshold that have remaining days
    const expiringBalances = await prisma.leaveBalance.findMany({
      where: {
        expiry_date: {
          gte: today,
          lte: thresholdDate,
        },
        remaining_days: {
          gt: 0,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            full_name: true,
            appUsers: {
              select: { email: true },
              take: 1,
            },
          },
        },
        leaveType: {
          select: { name: true },
        },
      },
    });

    const notificationsSent = [];
    const errors = [];

    // Send emails
    for (const balance of expiringBalances) {
      const employeeEmail = balance.employee.appUsers[0]?.email;
      if (!employeeEmail) continue;

      try {
        const expiryDateStr = balance.expiry_date
          ? new Date(balance.expiry_date).toLocaleDateString()
          : "soon";

        await sendEmail({
          to: employeeEmail,
          subject: `Leave Expiry Reminder: ${balance.leaveType.name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Leave Expiry Reminder</h2>
              <p>Dear ${balance.employee.full_name},</p>
              <p>This is a reminder that you have <strong>${balance.remaining_days} days</strong> of 
              <strong>${balance.leaveType.name}</strong> that will expire on <strong>${expiryDateStr}</strong>.</p>
              <p>Please ensure you use your leave balance before it expires.</p>
              <p>Best regards,<br>HR Department</p>
            </div>
          `,
        });

        notificationsSent.push({
          employee: balance.employee.full_name,
          leaveType: balance.leaveType.name,
          days: balance.remaining_days,
          expiry: expiryDateStr,
        });
      } catch (error) {
        errors.push({
          employee: balance.employee.full_name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.status(200).json({
      status: "success",
      message: `Processed ${expiringBalances.length} expiring records`,
      data: {
        sent_count: notificationsSent.length,
        details: notificationsSent,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};
