import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

export const getCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const companies = await prisma.company.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        company_code: true,
      },
    });

    res.status(200).json({
      status: "success",
      results: companies.length,
      data: {
        companies,
      },
    });
  } catch (error) {
    next(error);
  }
};
