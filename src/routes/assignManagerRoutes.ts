import express from "express";
import {
  searchPotentialManagers,
  getExistingManagers,
  removeTeamMember,
  assignManagers,
  getManagerTeamMembers
} from "src/controllers/assignManagerController";
import { protect } from "src/middleware/authMiddleware";
import { verifyAccessControl } from "src/middleware/verifyAccessControl";
import { Resources, ActionTypes } from "src/utils/constants";

const router = express.Router();

router.use(protect);

router.get(
  "/search",
  verifyAccessControl(Resources.EMPLOYMENT, ActionTypes.READ_ANY),
  searchPotentialManagers
);

router.get(
  "/existing-managers",
  verifyAccessControl(Resources.EMPLOYMENT, ActionTypes.READ_ANY),
  getExistingManagers
);

router.post(
  "/remove-member",
  verifyAccessControl(Resources.EMPLOYMENT, ActionTypes.UPDATE_ANY),
  removeTeamMember
);

router.post(
  "/bulk-assign",
  verifyAccessControl(Resources.EMPLOYMENT, ActionTypes.UPDATE_ANY),
  assignManagers
);

router.get(
  "/:managerId/team-members",
  verifyAccessControl(Resources.EMPLOYMENT, ActionTypes.READ_ANY),
  getManagerTeamMembers
);

export default router;
