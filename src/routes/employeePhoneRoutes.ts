import express from "express";
import {
  fetchAllPhones,
  fetchPhone,
  createPhone,
  bulkCreatePhones,
  updatePhone,
  deletePhone,
  bulkDeletePhones,
} from "src/controllers/employeePhoneController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

// protect all routes
router.use(protect);

router.get(
  "/employee/:employeeId",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchAllPhones,
);

router.get(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchPhone,
);

router.post(
  "/",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  createPhone,
);

router.post(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  bulkCreatePhones,
);

router.put(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updatePhone,
);

router.delete(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  bulkDeletePhones,
);

router.delete(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  deletePhone,
);

export default router;
