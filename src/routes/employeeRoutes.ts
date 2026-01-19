import express from "express";
import {
  createEmployee,
  fetchAllEmployee,
  fetchEmployee,
  fetchEmployeeDetail,
  countEmployees,
  updateEmployee,
  deleteEmployee,
  approveOnboarding,
  getMe,
  assignManager,
  activateEmployee,
} from "src/controllers/employeeController";
import { generateExperienceLetter } from "src/controllers/experienceLetterController";
import { exportEmployees } from "src/controllers/exportController";
import {
  fetchAllAddresses,
  fetchAddress,
  createAddress,
  bulkCreateAddresses,
  updateAddress,
  deleteAddress,
  bulkDeleteAddresses,
  replaceEmployeeAddresses
} from "../controllers/employeeAddressController";
import {
  fetchAllPhones,
  fetchPhone,
  createPhone,
  bulkCreatePhones,
  updatePhone,
  deletePhone,
  bulkDeletePhones,
  replaceEmployeePhones
} from "../controllers/employeePhoneController";
import {
  getContactInfo,
  createContactInfo,
  updateContactInfo,
  bulkCreatePhones as bulkCreateContactPhones,
} from "../controllers/contactInfoController";
import { replaceEmployeeEducations } from "src/controllers/educationController";
import { replaceEmployeeEmploymentHistory } from "src/controllers/employmentHistoryController";
import { replaceEmployeeCertifications } from "src/controllers/certificationController";
import { replaceEmployeeDocuments } from "src/controllers/employeeDocumentController";
import { replaceEmployeeEmploymentDetails } from "src/controllers/employmentController";
import { updatePersonalDetails } from "src/controllers/employeePersonalController";
import { updateFinancialDetails } from "src/controllers/employeeFinancialController";
import { protect, restrictTo } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

// protect all routes
router.use(protect);

router.get(
  "/",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchAllEmployee,
);

router.post(
  "/export",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  exportEmployees
);

router.get(
  "/count",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  countEmployees,
);


router.get(
  "/me",
  getMe,
);

router.get(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchEmployee,
);

router.get(
  "/:id/detail",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchEmployeeDetail,
);

router.get(
  "/:id/experience-letter",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  generateExperienceLetter,
);

router.post(
  "/",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  createEmployee,
);

router.put(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updateEmployee,
);

router.delete(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  deleteEmployee,
);

// Contact Info Routes
router.get(
  "/:employeeId/contact-info",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  getContactInfo,
);

router.post(
  "/contact-info",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  createContactInfo,
);

router.put(
  "/:employeeId/contact-info",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updateContactInfo,
);

router.post(
  "/contact-info/phones/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  deleteEmployee, // Changed from bulkCreateContactPhones to deleteEmployee as per instruction
);

router.post(
  "/:id/approve-onboarding",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  approveOnboarding,
);

router.patch(
  "/:id/assign-manager",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  assignManager,
);

router.patch(
  "/:id/activate",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  activateEmployee,
);


export default router;

// Granular Updates
// Granular Updates
router.patch(
  "/:id/personal-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updatePersonalDetails
);

router.patch(
  "/:id/financial-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updateFinancialDetails
);

router.patch(
  "/:id/employment-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeeEmploymentDetails
);

router.patch(
  "/:id/education-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeeEducations
);

router.patch(
  "/:id/work-experience-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeeEmploymentHistory
);

router.patch(
  "/:id/certifications-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeeCertifications
);

router.patch(
  "/:id/documents-details",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeeDocuments
);

router.patch(
  "/:id/addresses",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeeAddresses
);

router.patch(
  "/:id/phones",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  replaceEmployeePhones
);
