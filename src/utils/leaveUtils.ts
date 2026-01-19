/**
 * Leave Management Utility Functions
 *
 * Handles working day calculations, leave entitlement computation,
 * and other leave-related business logic.
 */

import { prisma } from "src/app";

/**
 * Check if a date is a Sunday
 */
export const isSunday = (date: Date): boolean => {
  return date.getDay() === 0;
};

/**
 * Check if a date is a Saturday
 */
export const isSaturday = (date: Date): boolean => {
  return date.getDay() === 6;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Check if a date is a public holiday
 */
export const isHoliday = async (
  date: Date,
  companyId: number,
  holidayCache?: Date[]
): Promise<boolean> => {
  // If holiday cache is provided, use it
  if (holidayCache) {
    return holidayCache.some((h) => h.toDateString() === date.toDateString());
  }

  // Otherwise, query the database
  const year = date.getFullYear();
  const holiday = await prisma.publicHoliday.findFirst({
    where: {
      company_id: companyId,
      OR: [
        // Exact date match
        {
          holiday_date: date,
          is_recurring: false,
        },
        // Recurring holiday (match month and day)
        {
          is_recurring: true,
          holiday_date: {
            gte: new Date(year, date.getMonth(), date.getDate()),
            lt: new Date(year, date.getMonth(), date.getDate() + 1),
          },
        },
      ],
    },
  });

  return !!holiday;
};

/**
 * Get all holidays for a date range (for caching)
 */
export const getHolidaysInRange = async (
  companyId: number,
  startDate: Date,
  endDate: Date
): Promise<Date[]> => {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const holidays = await prisma.publicHoliday.findMany({
    where: {
      company_id: companyId,
    },
  });

  const holidayDates: Date[] = [];

  for (const holiday of holidays) {
    if (holiday.is_recurring) {
      // For recurring holidays, add for each year in range
      for (let year = startYear; year <= endYear; year++) {
        const holidayDate = new Date(holiday.holiday_date);
        const recurringDate = new Date(
          year,
          holidayDate.getMonth(),
          holidayDate.getDate()
        );
        if (recurringDate >= startDate && recurringDate <= endDate) {
          holidayDates.push(recurringDate);
        }
      }
    } else {
      // For non-recurring, check if within range
      if (
        holiday.holiday_date >= startDate &&
        holiday.holiday_date <= endDate
      ) {
        holidayDates.push(holiday.holiday_date);
      }
    }
  }

  return holidayDates;
};

/**
 * Calculate working days between two dates
 * Based on 5.5-day work week (Mon-Fri full days, Saturday half day, Sunday off)
 * Excludes public holidays
 */
export const calculateWorkingDays = async (
  startDate: Date,
  endDate: Date,
  companyId: number,
  options?: {
    saturdayHalfDay?: boolean;
    sundayOff?: boolean;
  }
): Promise<number> => {
  const saturdayHalfDay = options?.saturdayHalfDay ?? true;
  const sundayOff = options?.sundayOff ?? true;

  // Get company leave settings
  const leaveSettings = await prisma.leaveSettings.findUnique({
    where: { company_id: companyId },
  });

  const isSaturdayHalf = leaveSettings?.saturday_half_day ?? saturdayHalfDay;
  const isSundayOff = leaveSettings?.sunday_off ?? sundayOff;

  // Get holidays in range for caching
  const holidays = await getHolidaysInRange(companyId, startDate, endDate);

  let days = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const isHolidayDate = holidays.some(
      (h) => h.toDateString() === current.toDateString()
    );

    if (isHolidayDate) {
      // Holiday - no work
    } else if (isSunday(current) && isSundayOff) {
      // Sunday off
    } else if (isSaturday(current)) {
      days += isSaturdayHalf ? 0.5 : 1;
    } else {
      // Mon-Fri - full day
      days += 1;
    }

    current = addDays(current, 1);
  }

  return days;
};

/**
 * Calculate return date (first working day after leave end)
 */
export const calculateReturnDate = async (
  endDate: Date,
  companyId: number
): Promise<Date> => {
  let returnDate = addDays(endDate, 1);

  // Get leave settings
  const leaveSettings = await prisma.leaveSettings.findUnique({
    where: { company_id: companyId },
  });

  const isSundayOff = leaveSettings?.sunday_off ?? true;

  // Skip weekends and holidays
  while (true) {
    const isHolidayDate = await isHoliday(returnDate, companyId);

    if (isHolidayDate || (isSunday(returnDate) && isSundayOff)) {
      returnDate = addDays(returnDate, 1);
    } else {
      break;
    }
  }

  return returnDate;
};

/**
 * Calculate leave entitlement for an employee
 *
 * For Annual Leave (per business requirements):
 * - First year: 16 working days (proportional if less than 1 year)
 * - After first year: +1 day for every 2 years of service
 *
 * @param baseDays - Base entitlement days (e.g., 16 for annual leave)
 * @param incrementalDays - Days to add per increment period (e.g., 1)
 * @param yearsOfService - Total years of service
 * @param incrementalPeriodYears - Years per increment (e.g., 2 for "every 2 years")
 * @param maxAccrualLimit - Maximum days that can accrue
 * @param monthsWorkedFirstYear - For proportional calculation in first year
 */
export const calculateLeaveEntitlement = (
  baseDays: number,
  incrementalDays: number,
  yearsOfService: number,
  maxAccrualLimit?: number | null,
  incrementalPeriodYears: number = 1,
  monthsWorkedFirstYear?: number
): number => {
  // For employees with less than 1 year of service, calculate proportional entitlement
  if (yearsOfService < 1 && monthsWorkedFirstYear !== undefined) {
    const proportionalDays = Math.round(
      (baseDays * monthsWorkedFirstYear) / 12
    );
    return Math.max(0, proportionalDays);
  }

  // For first year employees without month data, give full base
  if (yearsOfService <= 1) {
    return baseDays;
  }

  // Calculate incremental days based on period
  // Example: 3 years of service with 2-year period = 1 increment (years 2-3)
  const yearsAfterFirst = Math.max(0, yearsOfService - 1);
  const incrementPeriods = Math.floor(yearsAfterFirst / incrementalPeriodYears);
  let entitlement = baseDays + incrementPeriods * incrementalDays;

  // Apply max accrual limit if set
  if (maxAccrualLimit && entitlement > maxAccrualLimit) {
    entitlement = maxAccrualLimit;
  }

  return entitlement;
};

// ============================================================================
// GRADUAL LEAVE ACCRUAL FUNCTIONS
// ============================================================================

/**
 * Check if a year is a leap year
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * Get appropriate divisor based on configuration
 * Handles leap years when using 365/366
 */
export const getAccrualDivisor = (
  configuredDivisor: number,
  year: number,
  adjustForLeapYear: boolean = true
): number => {
  if (configuredDivisor === 365 && adjustForLeapYear && isLeapYear(year)) {
    return 366;
  }
  return configuredDivisor;
};

/**
 * Calculate daily leave accrual rate
 * @param annualEntitlement - Total annual leave days
 * @param divisor - Number of days to divide by (365, 360, or custom)
 */
export const calculateDailyAccrualRate = (
  annualEntitlement: number,
  divisor: number = 365
): number => {
  return annualEntitlement / divisor;
};

/**
 * Get the fiscal year start date based on company settings
 */
export const getFiscalYearStartDate = (
  fiscalYearStartMonth: number,
  referenceDate: Date = new Date()
): Date => {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-indexed

  // If current month is before fiscal year start, we're in the fiscal year that started last year
  if (currentMonth < fiscalYearStartMonth) {
    return new Date(currentYear - 1, fiscalYearStartMonth - 1, 1);
  }

  return new Date(currentYear, fiscalYearStartMonth - 1, 1);
};

export type LeaveAccrualBasis = "ANNIVERSARY" | "CALENDAR_YEAR";

const getJoinDateAnniversaryForYear = (joinDate: Date, year: number): Date => {
  const month = joinDate.getMonth();
  const day = joinDate.getDate();

  // Handles dates like Feb 29 in non-leap years by snapping to last day of month.
  const candidate = new Date(year, month, day);
  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }
  return candidate;
};

/**
 * Get the start date of the current anniversary-based accrual year.
 * Example: join date Mar 15 → for Jan 12, 2026 the period starts Mar 15, 2025.
 */
export const getAnniversaryYearStartDate = (
  joinDate: Date,
  referenceDate: Date = new Date()
): Date => {
  const thisYearAnniversary = getJoinDateAnniversaryForYear(
    joinDate,
    referenceDate.getFullYear()
  );

  if (referenceDate < thisYearAnniversary) {
    return getJoinDateAnniversaryForYear(
      joinDate,
      referenceDate.getFullYear() - 1
    );
  }

  return thisYearAnniversary;
};

/**
 * Calculate precise years of service (with decimals) for an employee
 * Used for determining tenure-based entitlements
 */
export const calculatePreciseYearsOfService = (
  hireDate: Date,
  referenceDate: Date = new Date()
): number => {
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const diffMs = referenceDate.getTime() - hireDate.getTime();
  return Math.max(0, diffMs / msPerYear);
};

/**
 * Calculate tenure-based annual entitlement
 * Every N years of service, add M days to base entitlement
 *
 * @param baseDays - Base annual leave days (e.g., 16)
 * @param yearsOfService - Total years of service
 * @param incrementPeriodYears - Years required for each increment (e.g., 2)
 * @param incrementAmount - Days added per increment cycle (e.g., 1)
 * @param maxCap - Maximum annual leave cap (optional)
 *
 * @example
 * // Employee with 5 years service, 2-year increment period, +1 day per period
 * // 5 years = 2 completed periods (years 0-1, 2-3) = 2 bonus days
 * // Total: 16 + 2 = 18 days
 */
export const calculateTenureEntitlement = (
  baseDays: number,
  yearsOfService: number,
  incrementPeriodYears: number = 2,
  incrementAmount: number = 1,
  maxCap?: number | null
): { entitlement: number; bonusDays: number; completedPeriods: number } => {
  // Completed periods = floor(years / period)
  // e.g., 5 years with 2-year period = 2 completed periods
  const completedPeriods = Math.floor(yearsOfService / incrementPeriodYears);
  const bonusDays = completedPeriods * incrementAmount;

  let entitlement = baseDays + bonusDays;

  // Apply max cap if specified
  if (maxCap && entitlement > maxCap) {
    entitlement = maxCap;
  }

  return { entitlement, bonusDays, completedPeriods };
};

export interface AccruedBalanceResult {
  accruedDays: number;
  daysInFiscalYear: number;
  dailyRate: number;
  fiscalYearStart: Date;
  annualEntitlement: number;
  tenureBonusDays: number;
}

/**
 * Calculate accrued leave balance from fiscal year start (or join date) to reference date
 * This implements gradual accrual instead of upfront allocation
 *
 * @param joinDate - Employee's hire/join date
 * @param referenceDate - Date to calculate accrual up to (usually today)
 * @param baseDays - Base annual leave entitlement
 * @param divisor - Accrual divisor (365, 360, etc.)
 * @param fiscalYearStartMonth - Month when fiscal year starts (1-12)
 * @param incrementPeriodYears - Years required for tenure increment
 * @param incrementAmount - Days added per tenure period
 * @param maxCap - Maximum annual leave cap
 */
export const calculateAccruedBalance = (
  joinDate: Date,
  referenceDate: Date,
  baseDays: number,
  divisor: number = 365,
  fiscalYearStartMonth: number = 1,
  incrementPeriodYears: number = 2,
  incrementAmount: number = 1,
  maxCap?: number | null,
  accrualBasis?: LeaveAccrualBasis
): AccruedBalanceResult => {
  // Determine the accrual period start.
  // - CALENDAR_YEAR: anchored to company fiscal year start month
  // - ANNIVERSARY: anchored to employee join-date anniversary
  const fiscalYearStart =
    accrualBasis === "ANNIVERSARY"
      ? getAnniversaryYearStartDate(joinDate, referenceDate)
      : getFiscalYearStartDate(fiscalYearStartMonth, referenceDate);

  // Calculate tenure-based entitlement
  const yearsOfService = calculatePreciseYearsOfService(
    joinDate,
    referenceDate
  );
  const { entitlement: annualEntitlement, bonusDays: tenureBonusDays } =
    calculateTenureEntitlement(
      baseDays,
      yearsOfService,
      incrementPeriodYears,
      incrementAmount,
      maxCap
    );

  // Determine accrual start date.
  // Always ensure accrual doesn't start before the employee actually joined.
  const accrualStartDate =
    joinDate > fiscalYearStart ? joinDate : fiscalYearStart;

  // Ensure reference date is not before start date
  if (referenceDate < accrualStartDate) {
    return {
      accruedDays: 0,
      daysInFiscalYear: 0,
      dailyRate: 0,
      fiscalYearStart,
      annualEntitlement,
      tenureBonusDays,
    };
  }

  // Calculate days worked in current fiscal year
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysInFiscalYear =
    Math.floor(
      (referenceDate.getTime() - accrualStartDate.getTime()) / msPerDay
    ) + 1; // +1 to include the start day

  // Adjust divisor for leap year if needed
  const year = referenceDate.getFullYear();
  const adjustedDivisor = getAccrualDivisor(divisor, year, true);

  // Calculate daily accrual rate
  const dailyRate = calculateDailyAccrualRate(
    annualEntitlement,
    adjustedDivisor
  );

  // Calculate accrued days (capped at annual entitlement)
  const rawAccruedDays = daysInFiscalYear * dailyRate;
  const accruedDays = Math.min(
    Math.round(rawAccruedDays * 100) / 100, // Round to 2 decimals
    annualEntitlement // Cap at annual entitlement
  );

  return {
    accruedDays,
    daysInFiscalYear,
    dailyRate: Math.round(dailyRate * 10000) / 10000, // 4 decimal precision for daily rate
    fiscalYearStart,
    annualEntitlement,
    tenureBonusDays,
  };
};

export interface CashOutCalculation {
  cashValue: number;
  eligibleDays: number;
  dailyRate: number;
  roundedValue: number;
}

/**
 * Calculate leave cash-out value
 * Formula: (monthly_salary / salary_divisor) * remaining_days
 *
 * @param remainingDays - Available leave days to cash out
 * @param monthlySalary - Employee's monthly salary
 * @param salaryDivisor - Divisor for daily rate (30, 26, etc.)
 * @param maxDays - Maximum days that can be cashed out (optional)
 * @param rounding - Rounding method: 'ROUND', 'FLOOR', 'CEIL'
 */
export const calculateLeaveCashValue = (
  remainingDays: number,
  monthlySalary: number,
  salaryDivisor: number = 30,
  maxDays?: number | null,
  rounding: "ROUND" | "FLOOR" | "CEIL" = "ROUND"
): CashOutCalculation => {
  const eligibleDays = maxDays
    ? Math.min(remainingDays, maxDays)
    : remainingDays;
  const dailyRate = monthlySalary / salaryDivisor;
  const rawCashValue = dailyRate * eligibleDays;

  let roundedValue: number;
  switch (rounding) {
    case "FLOOR":
      roundedValue = Math.floor(rawCashValue * 100) / 100;
      break;
    case "CEIL":
      roundedValue = Math.ceil(rawCashValue * 100) / 100;
      break;
    default:
      roundedValue = Math.round(rawCashValue * 100) / 100;
  }

  return {
    cashValue: rawCashValue,
    eligibleDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    roundedValue,
  };
};

/**
 * Calculate years of service for an employee
 */
export const calculateYearsOfService = (hireDate: Date): number => {
  const now = new Date();
  const years = now.getFullYear() - hireDate.getFullYear();

  // Adjust if anniversary hasn't occurred this year
  const currentMonth = now.getMonth();
  const hireMonth = hireDate.getMonth();

  if (
    currentMonth < hireMonth ||
    (currentMonth === hireMonth && now.getDate() < hireDate.getDate())
  ) {
    return Math.max(1, years - 1);
  }

  return Math.max(1, years);
};

/**
 * Get fiscal year based on company settings
 */
export const getFiscalYear = async (
  companyId: number,
  date: Date = new Date(),
  db: any = prisma
): Promise<number> => {
  const leaveSettings = await db.leaveSettings.findUnique({
    where: { company_id: companyId },
  });

  const fiscalYearStartMonth = leaveSettings?.fiscal_year_start_month ?? 1;
  const currentMonth = date.getMonth() + 1; // 1-indexed

  // If current month is before fiscal year start, we're in previous fiscal year
  if (currentMonth < fiscalYearStartMonth) {
    return date.getFullYear() - 1;
  }

  return date.getFullYear();
};

/**
 * Initialize leave balances for an employee (creates missing rows for the current fiscal year).
 *
 * This is useful right after onboarding approval so the employee immediately has leave balances.
 * Annual leave entitlement uses gradual accrual and respects the configured accrual basis
 * (ANNIVERSARY vs fiscal year anchoring).
 */
export const initializeLeaveBalancesForEmployee = async (
  companyId: number,
  employeeId: string,
  date: Date = new Date(),
  db: any = prisma
): Promise<{ fiscalYear: number; createdCount: number }> => {
  const fiscalYear = await getFiscalYear(companyId, date, db);

  const leaveSettings = await db.leaveSettings.findUnique({
    where: { company_id: companyId },
  });

  const settings = leaveSettings as any;
  const fiscalYearStartMonth = settings?.fiscal_year_start_month ?? 1;
  const accrualBasis = settings?.accrual_basis ?? "ANNIVERSARY";

  const employee = await db.employee.findUnique({
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

  const normalizeGender = (
    gender: string | null | undefined
  ): string | null => {
    if (!gender) return null;
    const g = gender.trim().toUpperCase();
    if (g === "M" || g === "MALE") return "Male";
    if (g === "F" || g === "FEMALE") return "Female";
    return gender;
  };

  const employeeGender = normalizeGender(employee?.gender);
  const hireDate =
    employee?.employments?.[0]?.start_date ?? employee?.created_at ?? date;

  const leaveTypes = await db.leaveType.findMany({
    where: {
      company_id: companyId,
      OR: employeeGender
        ? [{ applicable_gender: "All" }, { applicable_gender: employeeGender }]
        : [
            { applicable_gender: "All" },
            { applicable_gender: "Male" },
            { applicable_gender: "Female" },
          ],
    },
    orderBy: { name: "asc" },
  });

  if (!leaveTypes || leaveTypes.length === 0) {
    return { fiscalYear, createdCount: 0 };
  }

  const accrualConfig = {
    baseDays: settings?.annual_leave_base_days ?? 16,
    divisor: settings?.accrual_divisor ?? 365,
    fiscalYearStartMonth,
    accrualBasis,
    incrementPeriodYears: settings?.increment_period_years ?? 2,
    incrementAmount: settings?.increment_amount ?? 1,
    maxCap: settings?.max_annual_leave_cap ?? null,
  };

  const rows = leaveTypes.map((leaveType: any) => {
    const isAnnualLeave = leaveType.code === "ANNUAL";

    let entitlement: number;
    if (isAnnualLeave) {
      const baseDays =
        leaveType.default_allowance_days || accrualConfig.baseDays;
      const incrementPeriodYears =
        leaveType.incremental_period_years ??
        accrualConfig.incrementPeriodYears;
      const incrementAmount =
        leaveType.incremental_days_per_year ?? accrualConfig.incrementAmount;
      const maxCap = leaveType.max_accrual_limit ?? accrualConfig.maxCap;

      const accrualDetails = calculateAccruedBalance(
        hireDate,
        date,
        baseDays,
        accrualConfig.divisor,
        accrualConfig.fiscalYearStartMonth,
        incrementPeriodYears,
        incrementAmount,
        maxCap,
        accrualConfig.accrualBasis
      );

      entitlement = Number(accrualDetails.accruedDays);
    } else {
      const yearsOfService = calculateYearsOfService(hireDate);
      entitlement = calculateLeaveEntitlement(
        leaveType.default_allowance_days,
        leaveType.incremental_days_per_year || 0,
        yearsOfService,
        leaveType.max_accrual_limit
      );
    }

    const expiryDate = leaveType.carry_over_expiry_months
      ? calculateExpiryDate(
          fiscalYear,
          leaveType.carry_over_expiry_months,
          fiscalYearStartMonth
        )
      : null;

    return {
      employee_id: employeeId,
      company_id: companyId,
      leave_type_id: leaveType.id,
      fiscal_year: fiscalYear,
      total_entitlement: entitlement,
      used_days: 0,
      pending_days: 0,
      remaining_days: entitlement,
      expiry_date: expiryDate,
    };
  });

  const created = await db.leaveBalance.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { fiscalYear, createdCount: created.count };
};

/**
 * Calculate expiry date for leave balance (2-year rule)
 */
export const calculateExpiryDate = (
  fiscalYear: number,
  expiryMonths: number = 24,
  fiscalYearStartMonth: number = 1
): Date => {
  // Expiry is X months after the end of the fiscal year
  const fiscalYearEnd = new Date(fiscalYear + 1, fiscalYearStartMonth - 1, 1);
  const expiryDate = new Date(fiscalYearEnd);
  expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

  return expiryDate;
};

/**
 * Check if two date ranges overlap
 */
export const datesOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  return start1 <= end2 && end1 >= start2;
};

/**
 * Validate leave application dates
 */
export const validateLeaveDates = (
  startDate: Date,
  endDate: Date,
  returnDate: Date
): { valid: boolean; message?: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    return { valid: false, message: "Start date cannot be in the past" };
  }

  if (endDate < startDate) {
    return { valid: false, message: "End date must be after start date" };
  }

  if (returnDate < endDate) {
    return { valid: false, message: "Return date must be after end date" };
  }

  return { valid: true };
};

/**
 * Get the next approval level for a leave application
 */
export const getNextApprovalLevel = (
  currentStatus: string,
  employeeLevel: string
): string | null => {
  const approvalFlow: Record<string, string> = {
    PENDING_SUPERVISOR: "PENDING_HR",
    PENDING_HR: "PENDING_CEO",
    PENDING_CEO: "APPROVED",
  };

  // For non-managers, skip CEO approval
  if (
    currentStatus === "PENDING_HR" &&
    !["Manager", "Director", "Executive"].includes(employeeLevel)
  ) {
    return "APPROVED";
  }

  return approvalFlow[currentStatus] || null;
};

/**
 * Format decimal days to readable string
 */
export const formatDays = (days: number): string => {
  const wholeDays = Math.floor(days);
  const hasHalf = days % 1 === 0.5;

  if (hasHalf) {
    return wholeDays > 0 ? `${wholeDays}.5 days` : "0.5 days";
  }

  return `${wholeDays} day${wholeDays !== 1 ? "s" : ""}`;
};

export interface LeaveStats {
  totalEmployees: number;
  onLeaveToday: number;
  pendingApplications: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  byLeaveType: Array<{
    leaveType: string;
    count: number;
    totalDays: number;
  }>;
}

/**
 * Get leave statistics for dashboard
 */
export const getLeaveStatistics = async (
  companyId: number
): Promise<LeaveStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [
    totalEmployees,
    onLeaveToday,
    pendingApplications,
    approvedThisMonth,
    rejectedThisMonth,
    byLeaveType,
  ] = await Promise.all([
    // Total employees
    prisma.employee.count({
      where: { company_id: companyId },
    }),

    // On leave today
    prisma.leaveApplication.count({
      where: {
        company_id: companyId,
        current_status: "APPROVED",
        start_date: { lte: today },
        end_date: { gte: today },
      },
    }),

    // Pending applications
    prisma.leaveApplication.count({
      where: {
        company_id: companyId,
        current_status: {
          in: ["PENDING_SUPERVISOR", "PENDING_HR", "PENDING_CEO"],
        },
      },
    }),

    // Approved this month
    prisma.leaveApplication.count({
      where: {
        company_id: companyId,
        current_status: "APPROVED",
        updated_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),

    // Rejected this month
    prisma.leaveApplication.count({
      where: {
        company_id: companyId,
        current_status: "REJECTED",
        updated_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),

    // By leave type
    prisma.leaveApplication.groupBy({
      by: ["leave_type_id"],
      where: {
        company_id: companyId,
        current_status: "APPROVED",
        start_date: {
          gte: startOfMonth,
        },
      },
      _count: true,
      _sum: {
        requested_days: true,
      },
    }),
  ]);

  // Get leave type names
  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      company_id: companyId,
    },
  });

  const leaveTypeMap = new Map(leaveTypes.map((lt: any) => [lt.id, lt.name]));

  return {
    totalEmployees,
    onLeaveToday,
    pendingApplications,
    approvedThisMonth,
    rejectedThisMonth,
    byLeaveType: byLeaveType.map((item: any) => ({
      leaveType: leaveTypeMap.get(item.leave_type_id) || "Unknown",
      count: item._count,
      totalDays: Number(item._sum.requested_days) || 0,
    })),
  };
};
