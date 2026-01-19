import express from "express";
import { getRoles } from "src/controllers/roleController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  verifyAccessControl(Resources.ROLE, ActionTypes.READ_ANY),
  getRoles,
);

export default router;
