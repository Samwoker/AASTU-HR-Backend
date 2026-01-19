import express from "express";
import {
  fetchAllCertifications,
  fetchCertification,
  createCertification,
  bulkCreateCertifications,
  updateCertification,
  deleteCertification,
  bulkDeleteCertifications,
} from "src/controllers/certificationController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

router.use(protect);

router.get(
  "/employee/:employeeId",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchAllCertifications,
);

router.get(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchCertification,
);

router.post(
  "/",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  createCertification,
);

router.post(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  bulkCreateCertifications,
);

router.put(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updateCertification,
);

router.delete(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  bulkDeleteCertifications,
);

router.delete(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  deleteCertification,
);

export default router;
