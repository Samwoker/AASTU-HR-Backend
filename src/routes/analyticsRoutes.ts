import express from "express";
import {
  getAdvancedDashboardStats,
  getDepartmentGenderDistribution,
} from "src/controllers/analyticsController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

// Protect all routes
router.use(protect);

// Main dashboard advanced stats (Department breakdowns + Tenure/Probation)
router.get(
  "/advanced-stats",
  // Reuse EMPLOYMENT read permission as these are employment analytics
  // verifyAccessControl(Resources.EMPLOYMENT, ActionTypes.READ_ANY),
  getAdvancedDashboardStats,
);

export default router;
