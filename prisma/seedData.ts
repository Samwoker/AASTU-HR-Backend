export const departments = [
  // University / Higher Education oriented departments
  "Administration",
  "Human Resource",
  "Finance",
  "Academic Affairs",
  "Registrar",
  "Research and Graduate Studies",
  "Student Affairs",
  "Library Services",
  "Facilities and Procurement",
  "Information Technology",
  "Quality Assurance",
  "Planning and Development",
  "Health Services",
  "Legal",
];

export const jobTitles = [
  // University leadership
  { title: "University President", level: "Executive" },
  { title: "Vice President for Academic Affairs", level: "Executive" },
  { title: "Dean", level: "Director" },
  { title: "Head of Department", level: "Manager" },

  // Academic ranks
  { title: "Professor", level: "Senior" },
  { title: "Associate Professor", level: "Senior" },
  { title: "Assistant Professor", level: "Mid" },
  { title: "Lecturer", level: "Mid" },
  { title: "Adjunct Lecturer", level: "PartTime" },
  { title: "Research Fellow", level: "Senior" },

  // Administrative / professional
  { title: "Registrar", level: "Director" },
  { title: "Finance Manager", level: "Manager" },
  { title: "Senior Accountant", level: "Senior" },
  { title: "HR Manager", level: "Manager" },
  { title: "HR Officer", level: "Mid" },
  { title: "Admissions Officer", level: "Mid" },
  { title: "Student Affairs Officer", level: "Mid" },
  { title: "Library Manager", level: "Manager" },
  { title: "Librarian", level: "Mid" },
  { title: "IT Manager", level: "Manager" },
  { title: "Systems Administrator", level: "Mid" },
  { title: "Research Administrator", level: "Mid" },
  { title: "Lab Technician", level: "Junior" },
  { title: "Administrative Assistant", level: "Entry" },
  { title: "Facilities Manager", level: "Manager" },
  { title: "Procurement Officer", level: "Mid" },
  { title: "Health Services Nurse", level: "Mid" },
  { title: "Quality Assurance Officer", level: "Mid" },
];

export const roles = ["Admin", "HR", "Employee"];

export const resources = [
  // Core resources
  { code: "EMPLOYEE", name: "Employee Management" },
  { code: "EMPLOYMENT", name: "Employment Management" },
  { code: "USER", name: "User Management" },
  { code: "COMPANY", name: "Company Management" },
  { code: "ROLE", name: "Role Management" },
  // Leave management resources
  { code: "LEAVE_TYPE", name: "Leave Types" },
  { code: "LEAVE_APPLICATION", name: "Leave Applications" },
  { code: "LEAVE_BALANCE", name: "Leave Balances" },
  { code: "LEAVE_RECALL", name: "Leave Recalls" },
  { code: "PUBLIC_HOLIDAY", name: "Public Holidays" },
  { code: "LEAVE_SETTINGS", name: "Leave Settings" },
];

export const allActions = [
  "create:any",
  "read:any",
  "update:any",
  "delete:any",
  "create:own",
  "read:own",
  "update:own",
  "delete:own",
];

export const employeePermissions = [
  // User - can read own profile
  { resource: "USER", actions: ["read:own", "update:own"] },
  // Leave Types - can read
  { resource: "LEAVE_TYPE", actions: ["read:own", "read:any"] },
  // Leave Applications - can create own, read own, update own (cancel)
  {
    resource: "LEAVE_APPLICATION",
    actions: ["create:own", "read:own", "update:own"],
  },
  // Leave Balances - can read own
  { resource: "LEAVE_BALANCE", actions: ["read:own"] },
  // Leave Recalls - can read own, update own (respond)
  { resource: "LEAVE_RECALL", actions: ["read:own", "update:own"] },
  // Public Holidays - can read
  { resource: "PUBLIC_HOLIDAY", actions: ["read:own", "read:any"] },
];

export const getLeaveTypes = (companyId: number) => [
  {
    company_id: companyId,
    name: "Annual Leave",
    code: "ANNUAL",
    default_allowance_days: 16, // 16 working days for first year
    incremental_days_per_year: 1, // +1 day for every 2 years (handled in logic)
    max_accrual_limit: null,
    is_carry_over_allowed: true,
    carry_over_expiry_months: 24, // Maximum postponement: 2 years
    applicable_gender: "All",
    requires_attachment: false,
    is_paid: true,
  },
  {
    company_id: companyId,
    name: "Marriage Leave",
    code: "MARRIAGE",
    default_allowance_days: 3, // 3 working days
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "All",
    requires_attachment: true, // Marriage certificate
    is_paid: true,
  },
  {
    company_id: companyId,
    name: "Maternity Leave (Pre-natal)",
    code: "MATERNITY_PRE",
    default_allowance_days: 30, // 30 consecutive days before childbirth
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "Female",
    requires_attachment: true, // Medical certificate
    is_paid: true,
  },
  {
    company_id: companyId,
    name: "Maternity Leave (Post-natal)",
    code: "MATERNITY_POST",
    default_allowance_days: 90, // 90 consecutive days after childbirth
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "Female",
    requires_attachment: true, // Medical certificate
    is_paid: true,
  },
  {
    company_id: companyId,
    name: "Paternity Leave",
    code: "PATERNITY",
    default_allowance_days: 3, // 3 consecutive days
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "Male",
    requires_attachment: true, // Birth certificate
    is_paid: true,
  },
  {
    company_id: companyId,
    name: "Mourning/Bereavement Leave",
    code: "MOURNING",
    default_allowance_days: 3, // 3 working days
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "All",
    requires_attachment: false, // Death certificate optional
    is_paid: true,
  },
  {
    company_id: companyId,
    name: "Sick Leave",
    code: "SICK",
    default_allowance_days: 180, // 6 months total (30 days @100%, 60 days @50%, 90 days @0%)
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "All",
    requires_attachment: true, // Medical certificate required
    is_paid: true, // Payment tiers handled in payroll
  },
  {
    company_id: companyId,
    name: "Unpaid Leave",
    code: "UNPAID",
    default_allowance_days: 5, // Max 5 consecutive days per request
    incremental_days_per_year: 0,
    max_accrual_limit: null,
    is_carry_over_allowed: false,
    carry_over_expiry_months: null,
    applicable_gender: "All",
    requires_attachment: false,
    is_paid: false,
  },
];

export const allowanceTypes = [
  {
    name: "Representation Allowance",
    description: "Allowance for representation expenses",
  },
  { name: "Meal Allowance", description: "Daily meal allowance" },
  { name: "Housing Allowance", description: "Monthly housing support" },
  { name: "Transportation", description: "Transport allowance" },
  {
    name: "Project Allowance",
    description: "Allowance for specific project duties",
  },
];

// ---------------------------------------------------------------------------
// EDUCATION LOOKUP TABLES
// ---------------------------------------------------------------------------

export const educationLevels = [
  { name: "Certificate", display_order: 1 },
  { name: "Diploma", display_order: 2 },
  { name: "Advanced Diploma", display_order: 3 },
  { name: "Bachelor's Degree", display_order: 4 },
  { name: "Master's Degree", display_order: 5 },
  { name: "PhD", display_order: 6 },
];

export const fieldsOfStudy = [
  "Accounting",
  "Architecture",
  "Banking & Finance",
  "Business Administration",
  "Chemical Engineering",
  "Civil Engineering",
  "Computer Science",
  "Data Science",
  "Economics",
  "Electrical Engineering",
  "Finance",
  "Human Resource Management",
  "Information Systems",
  "Information Technology",
  "Law",
  "Management",
  "Marketing",
  "Mechanical Engineering",
  "Project Management",
  "Public Administration",
  "Software Engineering",
  "Statistics",
];

export const institutions = [
  { name: "Addis Ababa University", category: "Government" as const },
  {
    name: "Adama Science and Technology University",
    category: "Government" as const,
  },
  { name: "Jimma University", category: "Government" as const },
  { name: "University of Gondar", category: "Government" as const },
  { name: "Hawassa University", category: "Government" as const },
  { name: "Bahir Dar University", category: "Government" as const },
  { name: "Arba Minch University", category: "Government" as const },
  { name: "St. Mary's University", category: "Private" as const },
  { name: "Unity University", category: "Private" as const },
  {
    name: "Addis Ababa Science and Technology University",
    category: "Government" as const,
  },
];

// ---------------------------------------------------------------------------
// HR LOOKUP TABLES
// ---------------------------------------------------------------------------

export const separationReasons = [
  {
    reason_category: "Resignation",
    reason_detail: "Personal reasons",
    requires_exit_interview: true,
  },
  {
    reason_category: "Resignation",
    reason_detail: "Better opportunity",
    requires_exit_interview: true,
  },
  {
    reason_category: "Termination",
    reason_detail: "Performance",
    requires_exit_interview: true,
  },
  {
    reason_category: "Termination",
    reason_detail: "Policy violation",
    requires_exit_interview: true,
  },
  {
    reason_category: "End of Contract",
    reason_detail: "Contract completed",
    requires_exit_interview: false,
  },
  {
    reason_category: "Other",
    reason_detail: "Other",
    requires_exit_interview: false,
  },
];
