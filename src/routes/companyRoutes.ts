import express from "express";
import { getCompanies } from "src/controllers/companyController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  verifyAccessControl(Resources.COMPANY, ActionTypes.READ_ANY),
  getCompanies,
);

export default router;
