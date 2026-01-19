import { Request, Response, NextFunction } from "express";
import { verifyToken } from "src/utils/auth";
import { prisma } from "src/app";

// extend express request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        company_id: number;
        role: string;
        role_id: number;
        employee_id?: string;
      };
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1 get token
    let token: any;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in! Please log in to get access.",
      });
    }

    // 2 verify token
    const decoded = verifyToken(token);
    // console.log("decoded", decoded);

    // 3 check if user still exists
    const currentUser = await prisma.appUser.findUnique({
      where: { id: Number(decoded.id) },
      include: { role: true },
    });

    if (!currentUser) {
      return res.status(401).json({
        status: "fail",
        message: "The user belonging to this token does no longer exist.",
      });
    }

    // 4 grant access
    req.user = {
      user_id: currentUser.id.toString(),
      company_id: currentUser.company_id,
      role: currentUser.role.name,
      role_id: currentUser.role_id,
      employee_id: currentUser.employee_id || undefined,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid token or session expired",
    });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This assumes role names are stored in the AppRole table and joined in currentUser
    // We need to make sure we fetch the role name or check against role ID if roles are IDs
    // For now, let's assume we check against role name
    if (!req.user || !req.user.role || !roles.includes(String(req.user.role))) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};
