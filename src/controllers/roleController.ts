import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

export const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const companyId = req.user?.company_id
      ? Number(req.query.company_id)
      : undefined;

    const whereClause: any = {};
    if (companyId) {
      whereClause.company_id = companyId;
    }

    const roles = await prisma.appRole.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        company_id: true,
      },
    });

    res.status(200).json({
      status: "success",
      results: roles.length,
      data: {
        roles,
      },
    });
  } catch (error) {
    next(error);
  }
};
