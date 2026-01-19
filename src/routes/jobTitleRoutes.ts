import { Router } from "express";
import {
  getJobTitles,
  createJobTitle,
} from "../controllers/jobTitleController";
import { protect } from "../middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = Router();
router.use(protect);

router.get(
  "/",
  verifyAccessControl(Resources.ROLE, ActionTypes.READ_ANY),
  getJobTitles,
);

router.post(
  "/",
  verifyAccessControl(Resources.ROLE, ActionTypes.CREATE_ANY),
  createJobTitle,
);

export default router;
