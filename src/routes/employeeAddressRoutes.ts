import express from "express";
import {
  fetchAllAddresses,
  fetchAddress,
  createAddress,
  bulkCreateAddresses,
  updateAddress,
  deleteAddress,
  bulkDeleteAddresses,
} from "src/controllers/employeeAddressController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

// Protect all routes
router.use(protect);

router.get(
  "/employee/:employeeId",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchAllAddresses,
);

router.get(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.READ_ANY),
  fetchAddress,
);

router.post(
  "/",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  createAddress,
);

router.post(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.CREATE_ANY),
  bulkCreateAddresses,
);

router.put(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.UPDATE_ANY),
  updateAddress,
);

router.delete(
  "/bulk",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  bulkDeleteAddresses,
);

router.delete(
  "/:id",
  verifyAccessControl(Resources.EMPLOYEE, ActionTypes.DELETE_ANY),
  deleteAddress,
);

export default router;
