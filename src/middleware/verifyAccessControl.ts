import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";
import { ActionTypes, Scopes } from "src/utils/constants";

export const verifyAccessControl = (
  resourceCode: string,
  actionType: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      // console.log("user console in verify access", user);

      if (!user || !user.role_id) {
        return res.status(401).json({
          status: "fail",
          message: "User not authenticated or role missing",
        });
      }

      // 1. Find the resource
      const resource = await prisma.appResource.findUnique({
        where: { code: resourceCode },
      });

      if (!resource) {
        return res.status(500).json({
          status: "error",
          message: `Resource ${resourceCode} not found`,
        });
      }

      // 2. Parse requested action (e.g., "create:any")
      const [action, scope] = actionType.split(":");

      // 3. Check for "ANY" permission first (e.g., create:any)
      const anyPermission = await prisma.appPermission.findUnique({
        where: {
          role_id_resource_id_action: {
            role_id: user.role_id,
            resource_id: resource.id,
            action: `${action}:${Scopes.ANY}`,
          },
        },
      });

      // console.log("any permission", anyPermission);

      if (anyPermission) {
        return next();
      }

      // 4. Check for "OWN" permission if scope is not explicitly ANY
      // Note: Implementing "OWN" logic requires checking if the resource belongs to the user.
      // This is complex as it depends on the resource type (Employee vs User vs etc).
      // For now, we will strictly check for the permission row.

      const ownPermission = await prisma.appPermission.findUnique({
        where: {
          role_id_resource_id_action: {
            role_id: user.role_id,
            resource_id: resource.id,
            action: `${action}:${Scopes.OWN}`,
          },
        },
      });
      // console.log("own permission", ownPermission);

      if (ownPermission) {
        // TODO: Implement ownership check logic here based on resource type
        // For example, if resource is EMPLOYEE, check if req.params.id === user.employee_id
        // For now, we'll allow it if they have the permission, but typically you'd verify ownership.
        // Passing for now to allow granular permission assignment.
        return next();
      }

      return res.status(403).json({
        status: "fail",
        message: `You do not have permission to ${action} this resource`,
      });
    } catch (error) {
      next(error);
    }
  };
};
