import express from "express";
import {
  getAllLeaveApplications,
  getMyLeaveApplications,
  getPendingLeaveApplications,
  getLeaveApplicationById,
  createLeaveApplication,
  approveLeaveApplication,
  rejectLeaveApplication,
  cancelLeaveApplication,
  getCancellableLeaves,
  getEmployeesOnLeave,
  getLeaveStats,
  getReliefOfficers,
} from "src/controllers/leaveApplicationController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

// Protect all routes
router.use(protect);

// Employee routes (own data)
router.get(
  "/me",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_OWN),
  getMyLeaveApplications
);

// Alias for /me - frontend compatibility
router.get(
  "/my-applications",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_OWN),
  getMyLeaveApplications
);

router.get(
  "/cancellable",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_OWN),
  getCancellableLeaves
);

router.get(
  "/relief-officers",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_OWN),
  getReliefOfficers
);

router.post(
  "/",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.CREATE_OWN),
  createLeaveApplication
);

router.post(
  "/:id/cancel",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.UPDATE_OWN),
  cancelLeaveApplication
);

// Admin/HR/Manager routes
router.get(
  "/",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_ANY),
  getAllLeaveApplications
);

router.get(
  "/pending",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_ANY),
  getPendingLeaveApplications
);

router.get(
  "/on-leave",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_ANY),
  getEmployeesOnLeave
);

router.get(
  "/stats",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_ANY),
  getLeaveStats
);

// Alias for /stats - frontend compatibility
router.get(
  "/statistics",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_ANY),
  getLeaveStats
);

router.get(
  "/:id",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.READ_ANY),
  getLeaveApplicationById
);

router.post(
  "/:id/approve",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.UPDATE_ANY),
  approveLeaveApplication
);

router.post(
  "/:id/reject",
  verifyAccessControl(Resources.LEAVE_APPLICATION, ActionTypes.UPDATE_ANY),
  rejectLeaveApplication
);

export default router;

