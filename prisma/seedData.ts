export const departments = [
  // User provided
  "Chief Executive Officer", // Kept as requested, though usually a role
  "PMO",
  "Procurement and Facility Management",
  "Finance",
  "Human Resource",
  "Partnership & Business Development",
  "Operations",
  "Marketing & Communication",
  "Sales and Distribution",
  "Technology",
  "Legal",
  "Customer Support",
];

export const jobTitles = [
  // User provided
  { title: "Chief Executive Officer", level: "Executive" },
  { title: "Project Management Office Manager", level: "Manager" },
  { title: "Procurement and Facility Management - Head", level: "Director" },
  { title: "Head of Finance", level: "Director" },
  { title: "Senior Accountant", level: "Senior" },
  { title: "HR Specialist", level: "Mid" },
  { title: "Partnership and Business Development Manager", level: "Manager" },
  { title: "Product Owner", level: "Mid" },
  { title: "Data Science and Insight Analyst", level: "Mid" },
  { title: "Business Development and Innovation Expert", level: "Senior" },
  { title: "Junior Operations Expert", level: "Junior" },
  { title: "Contact Center Supervisor", level: "Senior" },
  { title: "Dispute and Reconcilation Management Expert", level: "Senior" },
  { title: "Operation Specialist", level: "Mid" },
  { title: "Operations Expert", level: "Senior" },
  { title: "Manager - Operations", level: "Manager" },
  { title: "Head- Dispute & Reconcilation", level: "Director" },
  { title: "Marketing and Communications Manager", level: "Manager" },
  { title: "UI/UX & Graphics Designer", level: "Mid" },
  { title: "Creative and Content Developer", level: "Mid" },
  { title: "Digital Marketing Specialist", level: "Mid" },
  { title: "Sales and Distribution Specialist", level: "Mid" },
  { title: "Sales and Distribution Manager", level: "Manager" },
  { title: "Regional Coordinator", level: "Manager" },
  { title: "Deputy Chief Technology Officer", level: "Executive" },
  { title: "Tech Lead", level: "Lead" },
  { title: "Lead-Mobile App Development", level: "Lead" },
  { title: "Senior Software Engineer", level: "Senior" },
  { title: "Senior Network Adminstrator", level: "Senior" },
  { title: "System Administrator", level: "Mid" },
  { title: "Senior Back end Engineer", level: "Senior" },
  { title: "Junior Software Engineer", level: "Junior" },
  { title: "Front-End Engineer", level: "Mid" },
  { title: "Mobile App Developer", level: "Mid" },
  { title: "Senior Mobile App Developer", level: "Senior" },
  { title: "QA and Process Engineer", level: "Mid" },
  { title: "Sales Representative", level: "Entry" },
  { title: "Junior Sales Representative", level: "Junior" },

  // Existing Merged
  { title: "Office Administrator", level: "Entry" },
  { title: "HR Officer", level: "Mid" },
  { title: "HR Manager", level: "Manager" },
  { title: "Accountant", level: "Mid" },
  { title: "Finance Manager", level: "Manager" },
  { title: "Software Engineer", level: "Mid" },
  { title: "DevOps Engineer", level: "Mid" },
  { title: "Sales Manager", level: "Manager" },
  { title: "General Manager", level: "Executive" },
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
