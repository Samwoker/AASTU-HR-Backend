/**
 * Export Controller for Aastu HRIS
 *
 * Handles export requests for employees, employments, and other data.
 * Supports PDF, CSV, and Excel formats with field selection.
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";
import {
  exportData,
  ExportField,
  EMPLOYEE_EXPORT_FIELDS,
  EMPLOYMENT_EXPORT_FIELDS,
} from "src/services/exportService";

// ============================================
// AVAILABLE FIELDS FOR EXPORT
// ============================================

const ALL_EMPLOYEE_FIELDS: ExportField[] = [
  { key: "id", label: "Employee ID", width: 15 },
  { key: "full_name", label: "Full Name", width: 25 },
  { key: "gender", label: "Gender", width: 10 },
  { key: "date_of_birth", label: "Date of Birth", width: 15 },
  { key: "tin_number", label: "TIN Number", width: 15 },
  { key: "pension_number", label: "Pension Number", width: 15 },
  { key: "place_of_work", label: "Place of Work", width: 20 },
  { key: "created_at", label: "Created At", width: 15 },
  // Employment-related (from active employment)
  { key: "employment.department.name", label: "Department", width: 20 },
  { key: "employment.jobTitle.title", label: "Job Title", width: 25 },
  { key: "employment.employment_type", label: "Employment Type", width: 15 },
  { key: "employment.gross_salary", label: "Gross Salary", width: 15 },
  { key: "employment.basic_salary", label: "Basic Salary", width: 15 },
  { key: "employment.start_date", label: "Hire Date", width: 15 },
  { key: "employment.manager.full_name", label: "Manager", width: 20 },
  // Contact info
  { key: "primary_phone", label: "Phone Number", width: 18 },
  { key: "primary_email", label: "Email", width: 25 },
  // Summaries
  { key: "experience_summary", label: "Work Experience", width: 40 },
  { key: "education_summary", label: "Education", width: 40 },
  { key: "allowance_summary", label: "Allowances", width: 30 },
];

const ALL_EMPLOYMENT_FIELDS: ExportField[] = [
  { key: "id", label: "Employment ID", width: 15 },
  { key: "employee.id", label: "Employee ID", width: 15 },
  { key: "employee.full_name", label: "Employee Name", width: 25 },
  { key: "employee.gender", label: "Gender", width: 10 },
  { key: "department.name", label: "Department", width: 20 },
  { key: "jobTitle.title", label: "Job Title", width: 25 },
  { key: "employment_type", label: "Employment Type", width: 15 },
  { key: "gross_salary", label: "Gross Salary", width: 15 },
  { key: "basic_salary", label: "Basic Salary", width: 15 },
  { key: "start_date", label: "Start Date", width: 15 },
  { key: "end_date", label: "End Date", width: 15 },
  { key: "probation_end_date", label: "Probation End", width: 15 },
  { key: "manager.full_name", label: "Manager", width: 20 },
  { key: "is_active", label: "Active", width: 10 },
  { key: "cost_sharing_status", label: "Cost Sharing", width: 15 },
  { key: "notes", label: "Notes", width: 30 },
];

// ============================================
// GET AVAILABLE FIELDS
// ============================================

export const getAvailableFields = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type } = req.query;

    let fields: ExportField[] = [];
    if (type === "employee") {
      fields = ALL_EMPLOYEE_FIELDS;
    } else if (type === "employment") {
      fields = ALL_EMPLOYMENT_FIELDS;
    } else {
      return res.status(400).json({
        status: "fail",
        message: "Invalid type. Must be 'employee' or 'employment'",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        fields: fields.map((f) => ({ key: f.key, label: f.label })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXPORT EMPLOYEES
// ============================================

export const exportEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[Export] exportEmployees called");
    console.log("[Export] Request body:", req.body);

    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const { format, fields: selectedFields, filters } = req.body;

    // Validate format
    if (!["pdf", "csv", "xlsx"].includes(format)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid format. Must be 'pdf', 'csv', or 'xlsx'",
      });
    }

    // Validate fields
    if (
      !selectedFields ||
      !Array.isArray(selectedFields) ||
      selectedFields.length === 0
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Please select at least one field to export",
      });
    }

    // Build where clause from filters
    const where: any = {
      company_id: companyId,
      id: { not: "EMP-ADMIN" }, // Exclude system admin
    };

    if (filters?.search) {
      where.OR = [
        { full_name: { contains: filters.search, mode: "insensitive" } },
        { id: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const employmentFilters: any = { is_active: true };

    if (filters?.cost_sharing_status) {
      employmentFilters.cost_sharing_status = filters.cost_sharing_status;
    }

    if (filters?.department_id) {
      // Check if it's a numeric ID or a name
      const deptId = parseInt(filters.department_id);
      if (!isNaN(deptId)) {
        employmentFilters.department_id = deptId;
      } else {
        employmentFilters.department = { name: filters.department_id };
      }
    }

    if (filters?.job_title_id) {
      const titleId = parseInt(filters.job_title_id);
      if (!isNaN(titleId)) {
        employmentFilters.job_title_id = titleId;
      } else {
        // If it's a level or title text
        employmentFilters.jobTitle = {
          OR: [
            { title: { contains: filters.job_title_id, mode: "insensitive" } },
            { level: { contains: filters.job_title_id, mode: "insensitive" } },
          ],
        };
      }
    }

    if (filters?.status === "active") {
      employmentFilters.is_active = true;
    } else if (filters?.status === "inactive") {
      employmentFilters.is_active = false;
    }

    if (Object.keys(employmentFilters).length > 0) {
      where.employments = { some: employmentFilters };
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.ids && Array.isArray(filters.ids) && filters.ids.length > 0) {
      where.id = { in: filters.ids };
    }

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where,
      include: {
        employments: {
          where: { is_active: true },
          include: {
            department: true,
            jobTitle: true,
            manager: { select: { id: true, full_name: true } },
            allowances: { include: { allowanceType: true } },
          },
          take: 1,
        },
        phones: { where: { is_primary: true }, take: 1 },
        appUsers: { select: { email: true }, take: 1 },
        // Include relations for summary fields
        employmentHistories: {
          orderBy: { start_date: "desc" },
          include: { jobTitle: true },
        },
        educations: {
          include: {
            educationLevel: true,
            institution: true,
            fieldOfStudy: true,
          },
          orderBy: { start_date: "desc" },
        },
      },
      orderBy: { full_name: "asc" },
    });

    // Transform data for export
    const exportData_ = employees.map((emp) => {
      const employment = emp.employments[0];

      // Format complex fields
      const formatDate = (d: any) =>
        d ? new Date(d).toLocaleDateString() : "";

      const experience_summary = emp.employmentHistories?.length
        ? emp.employmentHistories
            .map(
              (h) =>
                `• ${
                  h.previous_job_title_text ||
                  h.jobTitle?.title ||
                  "Unknown Role"
                } at ${h.previous_company_name} (${formatDate(
                  h.start_date
                )} - ${h.end_date ? formatDate(h.end_date) : "Present"})`
            )
            .join("\n")
        : "";

      const education_summary = emp.educations?.length
        ? emp.educations
            .map(
              (e) =>
                `• ${e.educationLevel?.name || "Unknown"} in ${
                  e.fieldOfStudy?.name || "Unknown"
                } at ${e.institution?.name || "Unknown"}`
            )
            .join("\n")
        : "";

      const allowance_summary = employment?.allowances?.length
        ? employment.allowances
            .map(
              (a) =>
                `• ${a.allowanceType?.name || "Allowance"}: ${a.amount} ${
                  a.currency
                }`
            )
            .join("\n")
        : "";
      return {
        ...emp,
        employment,
        primary_phone: emp.phones[0]?.phone_number || "",
        primary_email: emp.appUsers[0]?.email || "",
        experience_summary,
        education_summary,
        allowance_summary,
      };
    });

    // Get field definitions for selected fields
    const exportFields = selectedFields
      .map((key: string) => ALL_EMPLOYEE_FIELDS.find((f) => f.key === key))
      .filter(Boolean) as ExportField[];

    if (exportFields.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid fields selected",
      });
    }

    // Check if there's data to export
    if (exportData_.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No employees found matching the specified filters",
      });
    }

    // Generate export
    console.log(
      "[Export] Generating export with",
      exportFields.length,
      "fields for",
      exportData_.length,
      "employees"
    );
    const result = await exportData({
      format,
      fields: exportFields,
      data: exportData_,
      title: "Employee Report",
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      orientation: exportFields.length > 5 ? "landscape" : "portrait",
    });

    console.log("[Export] Export generated successfully, sending file");
    // Send file
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  } catch (error) {
    console.error("Export error:", error);
    next(error);
  }
};

// ============================================
// EXPORT EMPLOYMENTS
// ============================================

export const exportEmployments = async (
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

    const { format, fields: selectedFields, filters } = req.body;

    // Validate format
    if (!["pdf", "csv", "xlsx"].includes(format)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid format. Must be 'pdf', 'csv', or 'xlsx'",
      });
    }

    // Validate fields
    if (
      !selectedFields ||
      !Array.isArray(selectedFields) ||
      selectedFields.length === 0
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Please select at least one field to export",
      });
    }

    // Build where clause from filters
    const where: any = {
      company_id: companyId,
    };

    if (filters?.department_id) {
      where.department_id = parseInt(filters.department_id);
    }
    if (filters?.job_title_id) {
      where.job_title_id = parseInt(filters.job_title_id);
    }
    if (filters?.employment_type) {
      where.employment_type = filters.employment_type;
    }
    if (filters?.is_active !== undefined) {
      where.is_active =
        filters.is_active === true || filters.is_active === "true";
    }

    // Fetch employments
    const employments = await prisma.employment.findMany({
      where,
      include: {
        employee: { select: { id: true, full_name: true, gender: true } },
        department: true,
        jobTitle: true,
        manager: { select: { id: true, full_name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    // Get field definitions for selected fields
    const exportFields = selectedFields
      .map((key: string) => ALL_EMPLOYMENT_FIELDS.find((f) => f.key === key))
      .filter(Boolean) as ExportField[];

    if (exportFields.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid fields selected",
      });
    }

    // Generate export
    const result = await exportData({
      format,
      fields: exportFields,
      data: employments,
      title: "Employment Report",
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      orientation: exportFields.length > 6 ? "landscape" : "portrait",
    });

    // Send file
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXPORT SINGLE EMPLOYEE PROFILE
// ============================================

export const exportEmployeeProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    const { format, sections } = req.body;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    // Validate format
    if (!["pdf", "csv", "xlsx"].includes(format)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid format. Must be 'pdf', 'csv', or 'xlsx'",
      });
    }

    // Fetch comprehensive employee data
    const employee = await prisma.employee.findFirst({
      where: { id, company_id: companyId },
      include: {
        addresses: true,
        phones: true,
        employments: {
          include: {
            department: true,
            jobTitle: true,
            manager: { select: { id: true, full_name: true } },
            allowances: { include: { allowanceType: true } },
          },
          orderBy: { created_at: "desc" },
        },
        educations: {
          include: {
            educationLevel: true,
            fieldOfStudy: true,
            institution: true,
          },
        },
        licensesAndCertifications: true,
        careerEvents: {
          include: {
            previousJobTitle: true,
            newJobTitle: true,
          },
          orderBy: { event_date: "desc" },
        },
        appUsers: { select: { email: true, onboarding_status: true } },
        leaveBalances: {
          include: { leaveType: true },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // For single employee export, we'll create a simplified version
    // A full implementation would create a multi-section document
    const activeEmployment = employee.employments.find((e) => e.is_active);
    const profileData = [
      {
        field: "Employee ID",
        value: employee.id,
      },
      {
        field: "Full Name",
        value: employee.full_name,
      },
      {
        field: "Gender",
        value: employee.gender || "N/A",
      },
      {
        field: "Date of Birth",
        value: employee.date_of_birth?.toLocaleDateString() || "N/A",
      },
      {
        field: "Department",
        value: activeEmployment?.department?.name || "N/A",
      },
      {
        field: "Job Title",
        value: activeEmployment?.jobTitle?.title || "N/A",
      },
      {
        field: "Employment Type",
        value: activeEmployment?.employment_type || "N/A",
      },
      {
        field: "Gross Salary",
        value: activeEmployment?.gross_salary?.toString() || "N/A",
      },
      {
        field: "Start Date",
        value: activeEmployment?.start_date?.toLocaleDateString() || "N/A",
      },
      {
        field: "Manager",
        value: activeEmployment?.manager?.full_name || "N/A",
      },
      {
        field: "TIN Number",
        value: employee.tin_number || "N/A",
      },
      {
        field: "Pension Number",
        value: employee.pension_number || "N/A",
      },
      {
        field: "Email",
        value: employee.appUsers[0]?.email || "N/A",
      },
      {
        field: "Phone",
        value: employee.phones.find((p) => p.is_primary)?.phone_number || "N/A",
      },
    ];

    // Generate export
    const result = await exportData({
      format,
      fields: [
        { key: "field", label: "Field", width: 25 },
        { key: "value", label: "Value", width: 40 },
      ],
      data: profileData,
      title: `Employee Profile - ${employee.full_name}`,
      subtitle: `Employee ID: ${employee.id}`,
      orientation: "portrait",
    });

    // Send file
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};
