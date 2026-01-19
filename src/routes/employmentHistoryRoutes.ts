import express from "express";
import {
  fetchAllHistory,
  fetchHistory,
  createHistory,
  bulkCreateHistory,
  updateHistory,
  deleteHistory,
  bulkDeleteHistory,
} from "src/controllers/employmentHistoryController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

router.use(protect);

router.get(
  "/employee/:employeeId",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchAllHistory,
);
router.get(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchHistory,
);
router.post(
  "/",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  createHistory,
);
router.post(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  bulkCreateHistory,
);
router.put(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updateHistory,
);
router.delete(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  bulkDeleteHistory,
);
router.delete(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  deleteHistory,
);

export default router;
