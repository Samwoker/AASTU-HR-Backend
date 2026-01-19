/**
 * Export Service for Aastu HRIS
 *
 * Provides functionality to export data in multiple formats:
 * - PDF (using pdfmake with Printer for Node.js)
 * - CSV
 * - Excel (using exceljs)
 */

import ExcelJS from "exceljs";
import path from "path";

// Import PdfPrinter from the correct path and access the default export
const PdfPrinter = require("pdfmake/js/Printer").default;

// Define font paths for pdfmake Printer
const fontDescriptors = {
  Roboto: {
    normal: path.join(__dirname, "..", "assets", "fonts", "Roboto-Regular.ttf"),
    bold: path.join(__dirname, "..", "assets", "fonts", "Roboto-Medium.ttf"),
    italics: path.join(__dirname, "..", "assets", "fonts", "Roboto-Italic.ttf"),
    bolditalics: path.join(
      __dirname,
      "..",
      "assets",
      "fonts",
      "Roboto-MediumItalic.ttf"
    ),
  },
};

// Use any types for pdfmake to avoid module resolution issues
type TDocumentDefinitions = any;
type Content = any;
type TableCell = any;

// ============================================
// TYPES
// ============================================

export interface ExportField {
  key: string;
  label: string;
  width?: number; // For Excel column width
}

export interface ExportOptions {
  format: "pdf" | "csv" | "xlsx";
  fields: ExportField[];
  data: Record<string, any>[];
  title?: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  pageSize?: "A4" | "LETTER" | "LEGAL";
}

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

// ============================================
// BRAND CONSTANTS (matching email templates)
// ============================================
const BRAND = {
  primary: "#e55400",
  secondary: "#ffda00",
  dark: "#1a1a2e",
  lightGray: "#f8f9fa",
  companyName: "Aastu Digital Financial Service S.C",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (typeof value === "object") {
    // Handle nested objects like { name: "Engineering" }
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.full_name) return value.full_name;
    // Avoid JSON.stringify on complex objects to prevent circular ref crashes
    return "[Object]";
  }
  if (typeof value === "number") {
    // Format currency-like numbers
    if (value >= 1000) {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return value.toString();
  }
  return String(value);
};

const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split(".").reduce((current, key) => current?.[key], obj);
};

// ============================================
// CSV EXPORT
// ============================================

const exportToCSV = (options: ExportOptions): Buffer => {
  const { fields, data } = options;

  // Header row
  const header = fields
    .map((f) => `"${f.label.replace(/"/g, '""')}"`)
    .join(",");

  // Data rows
  const rows = data.map((record) => {
    return fields
      .map((field) => {
        const value = getNestedValue(record, field.key);
        const formatted = formatValue(value);
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  const csv = [header, ...rows].join("\n");
  return Buffer.from(csv, "utf-8");
};

// ============================================
// EXCEL EXPORT
// ============================================

const exportToExcel = async (options: ExportOptions): Promise<Buffer> => {
  const { fields, data, title, subtitle } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND.companyName;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title || "Export");

  // Title row
  if (title) {
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { size: 16, bold: true, color: { argb: "FF1A1A2E" } };
    titleRow.height = 25;
    worksheet.mergeCells(1, 1, 1, fields.length);
  }

  // Subtitle row
  if (subtitle) {
    const subtitleRow = worksheet.addRow([subtitle]);
    subtitleRow.font = { size: 11, italic: true, color: { argb: "FF666666" } };
    worksheet.mergeCells(2, 1, 2, fields.length);
  }

  // Empty row for spacing
  if (title || subtitle) {
    worksheet.addRow([]);
  }

  // Header row
  const headerRow = worksheet.addRow(fields.map((f) => f.label));
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE55400" }, // Brand primary color
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 22;

  // Data rows
  data.forEach((record, index) => {
    const rowData = fields.map((field) => {
      const value = getNestedValue(record, field.key);
      return formatValue(value);
    });
    const row = worksheet.addRow(rowData);

    // Alternating row colors
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8F9FA" },
        };
      });
    }

    // Borders and Alignment
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
      cell.alignment = { wrapText: true, vertical: "top" };
    });
  });

  // Auto-fit columns
  fields.forEach((field, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = field.width || Math.max(field.label.length + 4, 15);
  });

  // Footer
  const footerRowIndex = worksheet.rowCount + 2;
  const footerRow = worksheet.addRow([
    `Generated by ${BRAND.companyName} on ${new Date().toLocaleString()}`,
  ]);
  footerRow.font = { size: 9, italic: true, color: { argb: "FF999999" } };
  worksheet.mergeCells(footerRowIndex, 1, footerRowIndex, fields.length);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

// ============================================
// PDF EXPORT
// ============================================

const exportToPDF = async (options: ExportOptions): Promise<Buffer> => {
  console.log("[ExportService:PDF] Starting PDF generation");
  const {
    fields,
    data,
    title,
    subtitle,
    orientation = "portrait",
    pageSize = "A4",
  } = options;

  console.log("[ExportService:PDF] Building table with", data.length, "rows");

  // Build table header
  const tableHeader: TableCell[] = fields.map((f) => ({
    text: f.label,
    style: "tableHeader",
    alignment: "center" as const,
  }));

  // Build table body
  const tableBody: TableCell[][] = data.map((record) =>
    fields.map((field) => {
      const value = getNestedValue(record, field.key);
      const formatted = formatValue(value);
      return {
        text: formatted || "",
        style: "tableCell",
      };
    })
  );

  // Document definition
  const docDefinition: TDocumentDefinitions = {
    pageSize,
    pageOrientation: orientation,
    pageMargins: [40, 60, 40, 60],

    header: {
      columns: [
        {
          text: BRAND.companyName,
          style: "companyName",
          margin: [40, 20, 0, 0],
        },
        {
          text: new Date().toLocaleDateString(),
          alignment: "right" as const,
          style: "date",
          margin: [0, 20, 40, 0],
        },
      ],
    },

    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "center" as const,
          style: "footer",
          margin: [0, 0, 0, 20],
        },
      ],
    }),

    content: [
      // Title
      ...(title
        ? [
            {
              text: title,
              style: "title",
              margin: [0, 0, 0, 5] as [number, number, number, number],
            } as Content,
          ]
        : []),

      // Subtitle
      ...(subtitle
        ? [
            {
              text: subtitle,
              style: "subtitle",
              margin: [0, 0, 0, 15] as [number, number, number, number],
            } as Content,
          ]
        : []),

      // Table
      {
        table: {
          headerRows: 1,
          widths: fields.map(() => "*"),
          body: [tableHeader, ...tableBody],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#E0E0E0",
          vLineColor: () => "#E0E0E0",
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return BRAND.primary;
            return rowIndex % 2 === 0 ? "#F8F9FA" : null;
          },
        },
      } as Content,

      // Summary
      {
        text: `Total Records: ${data.length}`,
        style: "summary",
        margin: [0, 15, 0, 0] as [number, number, number, number],
      } as Content,
    ],

    styles: {
      companyName: {
        fontSize: 10,
        bold: true,
        color: BRAND.dark,
      },
      date: {
        fontSize: 9,
        color: "#666666",
      },
      title: {
        fontSize: 18,
        bold: true,
        color: BRAND.dark,
      },
      subtitle: {
        fontSize: 11,
        italics: true,
        color: "#666666",
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: "#FFFFFF",
      },
      tableCell: {
        fontSize: 9,
        color: "#333333",
      },
      footer: {
        fontSize: 8,
        color: "#999999",
      },
      summary: {
        fontSize: 10,
        bold: true,
        color: BRAND.dark,
      },
    },

    defaultStyle: {
      fontSize: 9,
      font: "Roboto",
    },
  };

  try {
    console.log("[ExportService:PDF] Creating PDF with Printer...");

    // Create printer instance with fonts
    const printer = new PdfPrinter(fontDescriptors);
    const pdfDoc = await printer.createPdfKitDocument(docDefinition);

    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      pdfDoc.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      pdfDoc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        console.log(
          "[ExportService:PDF] PDF generated successfully, size:",
          buffer.length
        );
        resolve(buffer);
      });

      pdfDoc.on("error", (err: Error) => {
        console.error("[ExportService:PDF] PDF stream error:", err);
        reject(err);
      });

      pdfDoc.end();
    });
  } catch (error) {
    console.error("[ExportService:PDF] PDF generation error:", error);
    throw error;
  }
};

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export const exportData = async (
  options: ExportOptions
): Promise<ExportResult> => {
  console.log("[ExportService] Starting export with format:", options.format);
  console.log("[ExportService] Data count:", options.data.length);
  console.log("[ExportService] Fields count:", options.fields.length);

  const timestamp = new Date().toISOString().slice(0, 10);
  const baseFilename = (options.title || "export")
    .toLowerCase()
    .replace(/\s+/g, "_");

  try {
    switch (options.format) {
      case "csv":
        console.log("[ExportService] Generating CSV...");
        return {
          buffer: exportToCSV(options),
          mimeType: "text/csv",
          filename: `${baseFilename}_${timestamp}.csv`,
        };

      case "xlsx":
        console.log("[ExportService] Generating XLSX...");
        return {
          buffer: await exportToExcel(options),
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          filename: `${baseFilename}_${timestamp}.xlsx`,
        };

      case "pdf":
        console.log("[ExportService] Generating PDF...");
        const pdfBuffer = await exportToPDF(options);
        console.log("[ExportService] PDF generated successfully");
        return {
          buffer: pdfBuffer,
          mimeType: "application/pdf",
          filename: `${baseFilename}_${timestamp}.pdf`,
        };

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    console.error("[ExportService] Export failed:", error);
    throw error;
  }
};

// ============================================
// PREDEFINED FIELD SETS
// ============================================

export const EMPLOYEE_EXPORT_FIELDS: ExportField[] = [
  { key: "id", label: "Employee ID", width: 15 },
  { key: "full_name", label: "Full Name", width: 25 },
  { key: "gender", label: "Gender", width: 10 },
  { key: "date_of_birth", label: "Date of Birth", width: 15 },
  { key: "tin_number", label: "TIN Number", width: 15 },
  { key: "pension_number", label: "Pension Number", width: 15 },
  { key: "place_of_work", label: "Place of Work", width: 20 },
];

export const EMPLOYMENT_EXPORT_FIELDS: ExportField[] = [
  { key: "employee.id", label: "Employee ID", width: 15 },
  { key: "employee.full_name", label: "Employee Name", width: 25 },
  { key: "department.name", label: "Department", width: 20 },
  { key: "jobTitle.title", label: "Job Title", width: 25 },
  { key: "employment_type", label: "Employment Type", width: 15 },
  { key: "gross_salary", label: "Gross Salary", width: 15 },
  { key: "basic_salary", label: "Basic Salary", width: 15 },
  { key: "start_date", label: "Start Date", width: 15 },
  { key: "is_active", label: "Status", width: 10 },
];

export const LEAVE_EXPORT_FIELDS: ExportField[] = [
  { key: "employee.full_name", label: "Employee Name", width: 25 },
  { key: "leaveType.name", label: "Leave Type", width: 20 },
  { key: "start_date", label: "Start Date", width: 15 },
  { key: "end_date", label: "End Date", width: 15 },
  { key: "total_days", label: "Days", width: 10 },
  { key: "status", label: "Status", width: 15 },
];
