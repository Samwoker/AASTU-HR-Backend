/**
 * Career Routes for Aastu HRIS
 * 
 * Routes for employee promotions, demotions, and transfers.
 */

import { Router } from "express";
import { protect } from "src/middleware/authMiddleware";
import {
  promoteEmployee,
  demoteEmployee,
  transferEmployee,
  getEmployeeCareerEvents,
  getAllCareerEvents,
} from "src/controllers/careerController";

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * POST /api/v1/career/promote
 * Promote an employee to a new position with salary increase
 */
router.post("/promote", promoteEmployee);

/**
 * POST /api/v1/career/demote
 * Demote an employee to a lower position
 */
router.post("/demote", demoteEmployee);

/**
 * POST /api/v1/career/transfer
 * Transfer an employee to a different department
 */
router.post("/transfer", transferEmployee);

/**
 * GET /api/v1/career/events/:employeeId
 * Get career history for a specific employee
 */
router.get("/events/:employeeId", getEmployeeCareerEvents);

/**
 * GET /api/v1/career/events
 * Get all career events with pagination and filters
 */
router.get("/events", getAllCareerEvents);

export default router;
