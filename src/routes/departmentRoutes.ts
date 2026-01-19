import { Router } from "express";
import {
  createDepartment,
  getDepartments,
  countDepartments,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController";
import { protect } from "../middleware/authMiddleware";
import { Resources, ActionTypes } from "src/utils/constants";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";

const router = Router();
router.use(protect);

router.get(
  "/count",
  verifyAccessControl(Resources.ROLE, ActionTypes.READ_ANY),
  countDepartments
);

router.get(
  "/",
  verifyAccessControl(Resources.ROLE, ActionTypes.READ_ANY),
  getDepartments
);

router.post(
  "/",
  verifyAccessControl(Resources.ROLE, ActionTypes.CREATE_ANY),
  createDepartment
);

router.put(
  "/:id",
  verifyAccessControl(Resources.ROLE, ActionTypes.UPDATE_ANY),
  updateDepartment
);

router.delete(
  "/:id",
  verifyAccessControl(Resources.ROLE, ActionTypes.DELETE_ANY),
  deleteDepartment
);

export default router;
