/**
 * Certificate of Service Generator
 *
 * Generates formal certificates of service for employees with 4 template variants:
 * 1. Active Employee - Single Role
 * 2. Active Employee - Multiple Roles
 * 3. Resigned Employee - Single Role
 * 4. Resigned Employee - Multiple Roles
 */

const PdfPrinter = require("pdfmake/js/Printer").default;
import * as fs from "fs";
import * as path from "path";

// Define font paths at module level - same pattern as exportService
const fontDescriptors = {
  Roboto: {
    normal: path.join(__dirname, "..", "assets", "fonts", "Roboto-Regular.ttf"),
    bold: path.join(__dirname, "..", "assets", "fonts", "Roboto-Medium.ttf"),
    italics: path.join(__dirname, "..", "assets", "fonts", "Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "..", "assets", "fonts", "Roboto-MediumItalic.ttf"),
  },
};

// Type definitions for pdfmake
type TDocumentDefinitions = any;
type Content = any;

// ============================================
// CONSTANTS
// ============================================

const BRAND = {
  primary: "#DB5E00",
  companyName: "Aastu Digital Financial Service S.C.",
  companyNameFull: "AASTU DIGITAL FINANCIAL SERVICES",
};

const SIGNATORY = {
  name: "Human Resources Department",
  title: "Aastu Digital Financial Service S.C.",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Read an image file and convert to base64 data URI
 */
function getBase64Image(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      return `data:${mimeType};base64,${file.toString("base64")}`;
    }
    return null;
  } catch (e) {
    console.error(`Failed to read image at ${filePath}`, e);
    return null;
  }
}

/**
 * Format a date to "Month Day, Year" format
 */
function formatDate(date: any): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Convert number to words (Ethiopian Birr context)
 */
function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertGroup(n % 100) : "");
  };

  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * 100);

  let result = "";

  if (intPart >= 1000000) {
    result += convertGroup(Math.floor(intPart / 1000000)) + " Million ";
    result += convertGroup(Math.floor((intPart % 1000000) / 1000));
    if (Math.floor((intPart % 1000000) / 1000) > 0) result += " Thousand ";
    result += convertGroup(intPart % 1000);
  } else if (intPart >= 1000) {
    result += convertGroup(Math.floor(intPart / 1000)) + " Thousand ";
    result += convertGroup(intPart % 1000);
  } else {
    result = convertGroup(intPart);
  }

  result = result.trim();

  if (decimalPart > 0) {
    result += " and " + decimalPart + "/100";
  }

  return result + " Birr";
}

/**
 * Format salary as "Birr XX,XXX.XX (Amount in Words)"
 */
function formatSalary(amount: number): { numeric: string; words: string } {
  const numeric = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const words = numberToWords(amount);
  return { numeric, words };
}

/**
 * Get pronoun set based on gender
 */
function getPronouns(gender: string | undefined): {
  title: string;
  subjective: string;
  possessive: string;
  possessiveLower: string;
  objective: string;
} {
  const isFemale = gender?.toLowerCase() === "female";
  return {
    title: isFemale ? "Ms." : "Mr.",
    subjective: isFemale ? "She" : "He",
    possessive: isFemale ? "Her" : "His",
    possessiveLower: isFemale ? "her" : "his",
    objective: isFemale ? "her" : "him",
  };
}

// ============================================
// ROLE HISTORY BUILDER
// ============================================

interface RoleHistory {
  title: string;
  level?: string;
  department?: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

/**
 * Build a chronological list of roles from employments and career events
 */
function buildRoleHistory(employeeData: any): RoleHistory[] {
  const { employments = [], careerEvents = [] } = employeeData;

  // Sort employments by start date
  const sortedEmployments = [...employments].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // If we have career events, build roles from them
  if (careerEvents.length > 0) {
    const roles: RoleHistory[] = [];

    // First role from initial employment
    const initial = sortedEmployments[0];
    if (initial) {
      const firstEventDate = careerEvents.length > 0 
        ? new Date(careerEvents[0].effective_date)
        : null;
      
      roles.push({
        title: initial.jobTitle?.title || "Employee",
        level: initial.jobTitle?.level,
        department: initial.department?.name,
        startDate: formatDate(initial.start_date),
        endDate: firstEventDate ? formatDate(new Date(firstEventDate.getTime() - 86400000)) : null,
        isCurrent: false,
      });
    }

    // Build roles from career events
    const sortedEvents = [...careerEvents].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    sortedEvents.forEach((event, index) => {
      const nextEvent = sortedEvents[index + 1];
      const isCurrent = !nextEvent && employments.some((e: any) => e.is_active);

      roles.push({
        title: event.newJobTitle?.title || event.new_job_title || "Employee",
        level: event.newJobTitle?.level || event.new_level,
        department: event.newDepartment?.name || event.new_department,
        startDate: formatDate(event.effective_date),
        endDate: nextEvent ? formatDate(new Date(new Date(nextEvent.effective_date).getTime() - 86400000)) : null,
        isCurrent,
      });
    });

    return roles;
  }

  // No career events - use employments directly
  return sortedEmployments.map((emp, index) => ({
    title: emp.jobTitle?.title || "Employee",
    level: emp.jobTitle?.level,
    department: emp.department?.name,
    startDate: formatDate(emp.start_date),
    endDate: emp.end_date ? formatDate(emp.end_date) : null,
    isCurrent: emp.is_active === true,
  }));
}

// ============================================
// TEMPLATE BUILDERS
// ============================================

interface TemplateData {
  fullName: string;
  pronouns: ReturnType<typeof getPronouns>;
  roles: RoleHistory[];
  grossSalary: number;
  isActive: boolean;
  refNumber: string;
  currentDate: string;
  stampBase64: string | null;
  logoBase64: string | null;
}

/**
 * Build the role history list for multiple roles template
 */
function buildRolesList(roles: RoleHistory[]): Content {
  return {
    ul: roles.map((role, index) => {
      const titleText = role.level ? `${role.title} (${role.level})` : role.title;
      const dateText = role.isCurrent
        ? `From ${role.startDate} up to now`
        : `From ${role.startDate} to ${role.endDate || "N/A"}`;

      return {
        text: [
          { text: titleText, bold: true },
          `: ${dateText}`,
        ],
        margin: [0, 2, 0, 2] as [number, number, number, number],
      };
    }),
    margin: [0, 10, 0, 15] as [number, number, number, number],
  };
}

/**
 * Template: Active Employee - Single Role
 */
function buildActiveSingleRoleContent(data: TemplateData): Content[] {
  const { fullName, pronouns, roles, grossSalary, refNumber, currentDate, stampBase64, logoBase64 } = data;
  const role = roles[0];
  const salary = formatSalary(grossSalary);

  const content: Content[] = [];

  // Header with logo
  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 35,
      margin: [0, 0, 0, 5] as [number, number, number, number],
    });
  }

  content.push(
    { text: BRAND.companyNameFull, style: "brandHeader" },
    {
      canvas: [{ type: "line", x1: 0, y1: 5, x2: 475, y2: 5, lineWidth: 2, lineColor: BRAND.primary }],
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    // Date and Ref
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            { text: [{ text: "Date: ", bold: true }, currentDate] },
            { text: [{ text: "Ref: ", bold: true }, refNumber], margin: [0, 5, 0, 0] as [number, number, number, number] },
          ],
          width: "auto",
          alignment: "right" as const,
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    // Title
    {
      text: "CERTIFICATE OF SERVICE",
      style: "certificateTitle",
      alignment: "center" as const,
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    // Body - Single Role Active
    {
      text: [
        "This is to certify that ",
        { text: `${pronouns.title} ${fullName}`, bold: true },
        " has been a permanent employee of ",
        { text: BRAND.companyName, bold: true },
        " working as a ",
        { text: role.level ? `${role.title} (${role.level})` : role.title, bold: true },
        " starting from ",
        { text: role.startDate, bold: true },
        " up to now.",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    // Salary paragraph
    {
      text: [
        { text: `${pronouns.title} ${fullName.split(" ").pop()}`, bold: true },
        " currently draws a monthly gross salary of ",
        { text: `Birr ${salary.numeric}`, bold: true },
        " (",
        { text: salary.words, italics: true },
        ").",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    // Tax and pension paragraph
    {
      text: `Income tax and pension contributions have been duly deducted from ${pronouns.possessiveLower} salary and paid to the concerned government authority during the period of ${pronouns.possessiveLower} employment with our company.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    // Professional qualities (from original template)
    {
      text: `${pronouns.subjective} has consistently displayed a high level of technical proficiency, collaborative spirit, and commitment to our mission of providing accessible digital financial solutions. ${pronouns.possessive} contributions have been highly valued by the organization.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    // Disclaimer
    {
      text: "This certificate is issued upon the employee's request for any lawful purpose it may serve. It does not, however, constitute a clearance.",
      lineHeight: 1.7,
      margin: [0, 0, 0, 30] as [number, number, number, number],
    },
    // Signature block
    buildSignatureBlock(stampBase64)
  );

  return content;
}

/**
 * Template: Active Employee - Multiple Roles
 */
function buildActiveMultipleRolesContent(data: TemplateData): Content[] {
  const { fullName, pronouns, roles, grossSalary, refNumber, currentDate, stampBase64, logoBase64 } = data;
  const salary = formatSalary(grossSalary);

  const content: Content[] = [];

  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 35,
      margin: [0, 0, 0, 5] as [number, number, number, number],
    });
  }

  content.push(
    { text: BRAND.companyNameFull, style: "brandHeader" },
    {
      canvas: [{ type: "line", x1: 0, y1: 5, x2: 475, y2: 5, lineWidth: 2, lineColor: BRAND.primary }],
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            { text: [{ text: "Date: ", bold: true }, currentDate] },
            { text: [{ text: "Ref: ", bold: true }, refNumber], margin: [0, 5, 0, 0] as [number, number, number, number] },
          ],
          width: "auto",
          alignment: "right" as const,
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    {
      text: "CERTIFICATE OF SERVICE",
      style: "certificateTitle",
      alignment: "center" as const,
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    // Body - Multiple Roles Active
    {
      text: [
        "This is to certify that ",
        { text: `${pronouns.title} ${fullName}`, bold: true },
        " is a permanent employee of ",
        { text: BRAND.companyName, bold: true },
        ", having served in the following capacities:",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    // Roles list
    buildRolesList(roles),
    // Salary
    {
      text: [
        { text: `${pronouns.title} ${fullName.split(" ").pop()}`, bold: true },
        " currently draws a monthly gross salary of ",
        { text: `Birr ${salary.numeric}`, bold: true },
        " (",
        { text: salary.words, italics: true },
        ").",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: `Income tax and pension contributions have been duly deducted from ${pronouns.possessiveLower} salary and paid to the concerned government authority during the period of ${pronouns.possessiveLower} employment with our company.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    // Professional growth narrative
    {
      text: `Throughout ${pronouns.possessiveLower} tenure with the company, ${pronouns.title} ${fullName} has demonstrated exceptional professional growth and commitment. ${pronouns.subjective} has consistently displayed a high level of technical proficiency, collaborative spirit, and dedication to our mission.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: "This certificate is issued upon the employee's request for any lawful purpose it may serve. It does not, however, constitute a clearance.",
      lineHeight: 1.7,
      margin: [0, 0, 0, 30] as [number, number, number, number],
    },
    buildSignatureBlock(stampBase64)
  );

  return content;
}

/**
 * Template: Resigned Employee - Single Role
 */
function buildResignedSingleRoleContent(data: TemplateData): Content[] {
  const { fullName, pronouns, roles, grossSalary, refNumber, currentDate, stampBase64, logoBase64 } = data;
  const role = roles[0];
  const salary = formatSalary(grossSalary);

  const content: Content[] = [];

  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 35,
      margin: [0, 0, 0, 5] as [number, number, number, number],
    });
  }

  content.push(
    { text: BRAND.companyNameFull, style: "brandHeader" },
    {
      canvas: [{ type: "line", x1: 0, y1: 5, x2: 475, y2: 5, lineWidth: 2, lineColor: BRAND.primary }],
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            { text: [{ text: "Ref: ", bold: true }, refNumber] },
            { text: [{ text: "Date: ", bold: true }, currentDate], margin: [0, 5, 0, 0] as [number, number, number, number] },
          ],
          width: "auto",
          alignment: "right" as const,
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    {
      text: "CERTIFICATE OF SERVICE",
      style: "certificateTitle",
      alignment: "center" as const,
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    // Body - Single Role Resigned
    {
      text: [
        "This is to certify that ",
        { text: `${pronouns.title} ${fullName}`, bold: true },
        " has been a permanent employee of ",
        { text: BRAND.companyName, bold: true },
        ", serving as a ",
        { text: role.level ? `${role.title} (${role.level})` : role.title, bold: true },
        " from ",
        { text: role.startDate, bold: true },
        " up to ",
        { text: role.endDate || "N/A", bold: true },
        ".",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: [
        { text: `${pronouns.title} ${fullName.split(" ").pop()}`, bold: true },
        " drew a monthly gross salary of ",
        { text: `Birr ${salary.numeric}`, bold: true },
        " (",
        { text: salary.words, italics: true },
        ") per month.",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: `Income tax and pension contributions have been duly deducted from ${pronouns.possessiveLower} salary and paid to the concerned government authority during ${pronouns.possessiveLower} employment with our company.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: [
        { text: `${pronouns.title} ${fullName.split(" ").pop()}`, bold: true },
        ` has resigned from our company on ${pronouns.possessiveLower} own accord.`,
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: `Aastu wishes ${pronouns.objective} all the best in ${pronouns.possessiveLower} future endeavors.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 30] as [number, number, number, number],
    },
    buildSignatureBlock(stampBase64)
  );

  return content;
}

/**
 * Template: Resigned Employee - Multiple Roles
 */
function buildResignedMultipleRolesContent(data: TemplateData): Content[] {
  const { fullName, pronouns, roles, grossSalary, refNumber, currentDate, stampBase64, logoBase64 } = data;
  const salary = formatSalary(grossSalary);

  const content: Content[] = [];

  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 35,
      margin: [0, 0, 0, 5] as [number, number, number, number],
    });
  }

  content.push(
    { text: BRAND.companyNameFull, style: "brandHeader" },
    {
      canvas: [{ type: "line", x1: 0, y1: 5, x2: 475, y2: 5, lineWidth: 2, lineColor: BRAND.primary }],
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    {
      columns: [
        { text: "", width: "*" },
        {
          stack: [
            { text: [{ text: "Date: ", bold: true }, currentDate] },
            { text: [{ text: "Ref: ", bold: true }, refNumber], margin: [0, 5, 0, 0] as [number, number, number, number] },
          ],
          width: "auto",
          alignment: "right" as const,
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    {
      text: "CERTIFICATE OF SERVICE",
      style: "certificateTitle",
      alignment: "center" as const,
      margin: [0, 0, 0, 25] as [number, number, number, number],
    },
    // Body - Multiple Roles Resigned
    {
      text: [
        "This is to certify that ",
        { text: `${pronouns.title} ${fullName}`, bold: true },
        " has been a permanent employee of ",
        { text: BRAND.companyName, bold: true },
        ", serving in the following capacities:",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    buildRolesList(roles),
    {
      text: [
        { text: `${pronouns.title} ${fullName.split(" ").pop()}`, bold: true },
        " drew a monthly gross salary of ",
        { text: `Birr ${salary.numeric}`, bold: true },
        " (",
        { text: salary.words, italics: true },
        ") per month.",
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: `Income tax and pension contributions have been duly deducted from ${pronouns.possessiveLower} salary and paid to the concerned government authority during the period of ${pronouns.possessiveLower} employment with our company.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: [
        { text: `${pronouns.title} ${fullName.split(" ").pop()}`, bold: true },
        ` has resigned from our company on ${pronouns.possessiveLower} own accord.`,
      ],
      lineHeight: 1.7,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    {
      text: `Aastu wishes ${pronouns.objective} all the best in ${pronouns.possessiveLower} future endeavors.`,
      lineHeight: 1.7,
      margin: [0, 0, 0, 30] as [number, number, number, number],
    },
    buildSignatureBlock(stampBase64)
  );

  return content;
}

/**
 * Build the signature block with stamp
 */
function buildSignatureBlock(stampBase64: string | null): Content {
  return {
    columns: [
      {
        stack: [
          { text: "Sincerely,", margin: [0, 0, 0, 10] as [number, number, number, number] },
          stampBase64
            ? {
                image: stampBase64,
                width: 100,
                margin: [0, 0, 0, 5] as [number, number, number, number],
              }
            : { text: "", margin: [0, 0, 0, 50] as [number, number, number, number] },
          { text: SIGNATORY.name, bold: true, fontSize: 11 },
          { text: SIGNATORY.title, color: "#666666", fontSize: 10 },
        ],
      },
      { text: "", width: "*" },
    ],
  };
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class CertificateOfServiceService {
  /**
   * Generate a Certificate of Service PDF based on employee data
   */
  static async generate(employeeData: any): Promise<Buffer> {
    // Extract data
    const { full_name, id, gender, employments = [] } = employeeData;

    // Load assets
    // Use __dirname-relative paths that work in both dev (src/) and prod (dist/)
    const logoPath = path.join(__dirname, "..", "assets", "aastu_logo.jpg");
    const stampPath = path.join(__dirname, "..", "assets", "aastu-stamp.png");
    const logoBase64 = getBase64Image(logoPath);
    const stampBase64 = getBase64Image(stampPath);

    // Build role history
    const roles = buildRoleHistory(employeeData);
    const hasMultipleRoles = roles.length > 1;

    // Determine if employee is active
    const isActive = employments.some((e: any) => e.is_active === true);

    // Get current/last salary
    const activeEmployment = employments.find((e: any) => e.is_active) || employments[employments.length - 1];
    const grossSalary = Number(activeEmployment?.gross_salary) || 0;

    // Generate reference number
    const refYear = new Date().getFullYear();
    const paddedId = (id || "").toString().padStart(3, "0");
    const refNumber = `KDFS/HR/${refYear}/${paddedId}`;

    // Get pronouns
    const pronouns = getPronouns(gender);

    // Template data
    const templateData: TemplateData = {
      fullName: full_name,
      pronouns,
      roles,
      grossSalary,
      isActive,
      refNumber,
      currentDate: formatDate(new Date()),
      stampBase64,
      logoBase64,
    };

    // Select and build appropriate template
    let content: Content[];

    if (isActive) {
      content = hasMultipleRoles
        ? buildActiveMultipleRolesContent(templateData)
        : buildActiveSingleRoleContent(templateData);
    } else {
      content = hasMultipleRoles
        ? buildResignedMultipleRolesContent(templateData)
        : buildResignedSingleRoleContent(templateData);
    }

    // Document definition
    const docDefinition: TDocumentDefinitions = {
      pageSize: "A4",
      pageMargins: [60, 40, 60, 60],
      content,
      styles: {
        brandHeader: {
          fontSize: 20,
          bold: true,
          color: BRAND.primary,
          margin: [0, 0, 0, 5],
        },
        certificateTitle: {
          fontSize: 14,
          bold: true,
          decoration: "underline",
        },
      },
      defaultStyle: {
        font: "Roboto",
        fontSize: 11,
        color: "#222222",
      },
    };

    try {
      console.log("[CertificateOfServiceService] Creating PDF with Printer...");

      // Create printer instance - exactly like exportService
      const printer = new PdfPrinter(fontDescriptors);
      const pdfDoc = await printer.createPdfKitDocument(docDefinition);

      return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        pdfDoc.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pdfDoc.on("end", () => {
          const buffer = Buffer.concat(chunks);
          console.log("[CertificateOfServiceService] PDF generated successfully, size:", buffer.length);
          resolve(buffer);
        });

        pdfDoc.on("error", (err: Error) => {
          console.error("[CertificateOfServiceService] PDF stream error:", err);
          reject(err);
        });

        pdfDoc.end();
      });
    } catch (e) {
      console.error("[CertificateOfServiceService] PDF generation error:", e);
      throw e;
    }
  }
}
