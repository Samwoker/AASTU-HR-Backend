import express from "express";

import authRoutes from "src/routes/authRoutes";
import companyRoutes from "src/routes/companyRoutes";
import employeeRoutes from "src/routes/employeeRoutes";
import employmentRoutes from "src/routes/employmentRoutes";
import roleRoutes from "src/routes/roleRoutes";
import userRoutes from "src/routes/userRoutes";
import employeePhoneRoutes from "src/routes/employeePhoneRoutes";
import employeeAddressRoutes from "src/routes/employeeAddressRoutes";
import certificationRoutes from "src/routes/certificationRoutes";
import educationRoutes from "src/routes/educationRoutes";
import employmentHistoryRoutes from "src/routes/employmentHistoryRoutes";
import jobTitleRoutes from "src/routes/jobTitleRoutes";
import departmentRoutes from "src/routes/departmentRoutes";
import onboardingRoutes from "src/routes/onboardingRoutes";
import allowanceTypeRoutes from "src/routes/allowanceTypeRoutes";
import exportRoutes from "src/routes/exportRoutes";
import analyticsRoutes from "src/routes/analyticsRoutes";
import assignManagerRoutes from "src/routes/assignManagerRoutes";
import suggestionRoutes from "src/routes/suggestionRoutes";
import uploadRoutes from "src/routes/uploadRoutes";

import careerRoutes from "src/routes/careerRoutes";
import experienceLetterRoutes from "src/routes/experienceLetterRoutes";
import certificateOfServiceRoutes from "src/routes/certificateOfServiceRoutes";

// Leave Management Routes
import leaveTypeRoutes from "src/routes/leaveTypeRoutes";
import leaveApplicationRoutes from "src/routes/leaveApplicationRoutes";
import leaveBalanceRoutes from "src/routes/leaveBalanceRoutes";
import publicHolidayRoutes from "src/routes/publicHolidayRoutes";
import leaveRecallRoutes from "src/routes/leaveRecallRoutes";
import leaveSettingsRoutes from "src/routes/leaveSettingsRoutes";
import leaveCashOutRoutes from "src/routes/leaveCashOutRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/employments", employmentRoutes);
router.use("/users", userRoutes);
router.use("/companies", companyRoutes);
router.use("/roles", roleRoutes);
router.use("/job-titles", jobTitleRoutes);
router.use("/departments", departmentRoutes);
router.use("/employee-phones", employeePhoneRoutes);
router.use("/employee-addresses", employeeAddressRoutes);
router.use("/certifications", certificationRoutes);
router.use("/educations", educationRoutes);
router.use("/employment-history", employmentHistoryRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/allowance-types", allowanceTypeRoutes);
router.use("/export", exportRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/assign-managers", assignManagerRoutes);
router.use("/suggestions", suggestionRoutes);
router.use("/upload", uploadRoutes);

// Leave Management
router.use("/leave-types", leaveTypeRoutes);
router.use("/leave-applications", leaveApplicationRoutes);
router.use("/leave-balances", leaveBalanceRoutes);
router.use("/public-holidays", publicHolidayRoutes);
router.use("/leave-recalls", leaveRecallRoutes);
router.use("/leave-settings", leaveSettingsRoutes);
router.use("/leave-cash-out", leaveCashOutRoutes);

// Career Management
router.use("/career", careerRoutes);
router.use("/experience-letter", experienceLetterRoutes);
router.use("/certificate-of-service", certificateOfServiceRoutes);

export default router;
