import { Request, Response, NextFunction } from "express";
import prisma from "src/prisma";

/**
 * Get Department-wise Gender Distribution
 * Returns a list of departments with their male/female counts.
 */
export const getDepartmentGenderDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) throw new Error("Company ID not found");

    // We need to group by Department AND Gender
    // Prisma doesn't natively support multi-level deep grouping + counting easily in one go
    // for relations without flat ids. exist.
    // However, Employment has department_id. We can fetch all active employments
    // and aggregate in memory for flexibility, or use efficient groupBy.

    // Efficient Approach: Group by department_id and join employee to check gender?
    // Prisma limitation: groupBy cannot traverse relations for the key (e.g. employee.gender).
    // So we fetch data or use raw query. Raw query is best for complex analytics but let's try Prisma way first if possible.
    // Actually, we can just fetch all active employments with { department_id, employee: { gender } } 
    // and aggregate in JS. This is fine for < 10k records, which is typical for this scale.
    // If it scales up, we switch to raw SQL.

    const employments = await prisma.employment.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        department_id: { not: null },
      },
      select: {
        department_id: true,
        department: { select: { name: true } },
        employee: { select: { gender: true } },
      },
    });

    const stats: Record<string, { gender: { male: number; female: number } }> = {};

    employments.forEach((emp) => {
      const deptId = emp.department_id?.toString() || "Unknown";
      // Initialize if not exists
      if (!stats[deptId]) {
        stats[deptId] = {
          gender: { male: 0, female: 0 }
        };
      }

      const g = emp.employee.gender?.toLowerCase();
      if (g === "male") stats[deptId].gender.male++;
      else if (g === "female") stats[deptId].gender.female++;
    });

    return res.status(200).json({
      status: "success",
      data: stats,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Full Dashboard Advanced Analytics
 * Returns breakdown for the Dashboard "Insight Card" logic + Extra Strategic Stats
 */
/**
 * Get Full Dashboard Advanced Analytics
 * Returns a comprehensive payload with ALL dashboard stats in one go.
 */
export const getAdvancedDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) throw new Error("Company ID not found");

    // 1. Fetch Core Data (All Employments for existing active employees)
    // We only count as "Active" if they are active AND completed onboarding
    const activeEmployments = await prisma.employment.findMany({
      where: {
        company_id: companyId,
        is_active: true,
      },
      select: {
        department_id: true,
        department: { select: { name: true } },
        jobTitle: { select: { level: true } },
        employee: { select: { gender: true } },
        employment_type: true,
        probation_end_date: true,
        manager_id: true,
        start_date: true,
      },
    });

    // 2. Fetch Additional Counts (DB Queries for things not in activeEmployments)
    const [
      totalEmployeesCount,
      totalDepartmentsCount,
      inactiveEmployeesCount,
    ] = await Promise.all([
      // Total Employees = Unique employees who COMPLETED onboarding
      prisma.employee.count({
        where: {
          company_id: companyId,
          appUsers: {
            some: {
              onboarding_status: "COMPLETED",
            },
          },
        },
      }),
      prisma.department.count({ where: { company_id: companyId } }),
      // Inactive Employees = Unique COMPLETED employees who lack ANY active employment
      prisma.employee.count({
        where: {
          company_id: companyId,
          appUsers: {
            some: {
              onboarding_status: "COMPLETED",
            },
          },
          employments: {
            none: {
              is_active: true,
            },
          },
        },
      }),
    ]);

    // 3. Initialize Aggregators
    const stats = {
      // Base Counts
      totalEmployees: totalEmployeesCount,
      totalDepartments: totalDepartmentsCount,
      activeEmployees: activeEmployments.length,
      inactiveEmployees: inactiveEmployeesCount,
      totalManagers: 0, // Calculated below

      // Global Distributions
      genderDist: { male: 0, female: 0 },
      empTypeDist: {} as Record<string, number>,
      deptDist: {} as Record<string, number>,
      jobLevelDist: {} as Record<string, number>,
      managerDist: { Managers: 0, NonManagers: 0 },

      // Advanced / Deep-Dive
      departmentBreakdown: {} as Record<string, {
        name: string;
        gender: { male: number; female: number };
        jobLevels: Record<string, number>;
      }>,
      tenureDistribution: {
        "<1 Year": 0,
        "1-3 Years": 0,
        "3-5 Years": 0,
        "5+ Years": 0
      },
      probationStatus: {
        "In Probation": 0,
        "Confirmed": 0
      }
    };

    const managersSet = new Set<string>(); // To count unique managers
    const now = new Date();

    // 4. Single Pass Aggregation
    activeEmployments.forEach(emp => {
      // --- Global: Gender ---
      const g = emp.employee.gender?.toLowerCase();
      if (g === "male") stats.genderDist.male++;
      else if (g === "female") stats.genderDist.female++;

      // --- Global: Employment Type ---
      const eType = emp.employment_type || "Unknown";
      stats.empTypeDist[eType] = (stats.empTypeDist[eType] || 0) + 1;

      // --- Global: Job Level ---
      const level = emp.jobTitle?.level || "Unspecified";
      stats.jobLevelDist[level] = (stats.jobLevelDist[level] || 0) + 1;

      // --- Global & Advanced: Department ---
      if (emp.department_id) {
        const deptName = emp.department?.name || "Unknown";
        const deptId = emp.department_id.toString();

        // Global Dept Dist
        stats.deptDist[deptName] = (stats.deptDist[deptName] || 0) + 1;

        // Advanced Breakdown
        if (!stats.departmentBreakdown[deptId]) {
          stats.departmentBreakdown[deptId] = {
            name: deptName,
            gender: { male: 0, female: 0 },
            jobLevels: {}
          };
        }
        // Breakdown: Gender
        if (g === "male") stats.departmentBreakdown[deptId].gender.male++;
        else if (g === "female") stats.departmentBreakdown[deptId].gender.female++;

        // Breakdown: Job Level
        const lvl = level;
        stats.departmentBreakdown[deptId].jobLevels[lvl] = (stats.departmentBreakdown[deptId].jobLevels[lvl] || 0) + 1;
      }

      // --- Global: Manager Count ---
      if (emp.manager_id) {
        managersSet.add(emp.manager_id);
      }

      // --- Advanced: Tenure ---
      const startDate = new Date(emp.start_date);
      const diffYears = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 1) stats.tenureDistribution["<1 Year"]++;
      else if (diffYears < 3) stats.tenureDistribution["1-3 Years"]++;
      else if (diffYears < 5) stats.tenureDistribution["3-5 Years"]++;
      else stats.tenureDistribution["5+ Years"]++;

      // --- Advanced: Probation ---
      const isProbation = emp.probation_end_date && new Date(emp.probation_end_date) > now;
      if (isProbation) stats.probationStatus["In Probation"]++;
      else stats.probationStatus["Confirmed"]++;
    });

    // Finalize Manager Stats
    stats.totalManagers = managersSet.size;
    stats.managerDist = {
      Managers: managersSet.size,
      NonManagers: stats.activeEmployees - managersSet.size
    };

    return res.status(200).json({
      status: "success",
      data: stats,
    });

  } catch (error) {
    next(error);
  }
};
