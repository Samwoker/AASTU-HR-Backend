import { Request, Response, NextFunction } from "express";
import prisma from "src/prisma";

export const getDepartmentSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = req.query.q as string;
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({ status: "fail", message: "Company ID required" });
    }

    const departments = await prisma.department.findMany({
      where: {
        company_id: companyId,
        name: { contains: q, mode: "insensitive" },
      },
      select: { name: true },
      take: 10,
    });

    res.status(200).json({
      status: "success",
      data: departments.map((d) => d.name),
    });
  } catch (error) {
    next(error);
  }
};

export const getJobTitleSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = req.query.q as string;
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({ status: "fail", message: "Company ID required" });
    }

    const jobTitles = await prisma.jobTitle.findMany({
      where: {
        company_id: companyId,
        title: { contains: q, mode: "insensitive" },
      },
      select: { title: true },
      distinct: ["title"],
      take: 10,
    });

    res.status(200).json({
      status: "success",
      data: jobTitles.map((jt) => jt.title),
    });
  } catch (error) {
    next(error);
  }
};

export const getJobLevelSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = req.query.q as string;
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({ status: "fail", message: "Company ID required" });
    }

    const jobLevels = await prisma.jobTitle.findMany({
      where: {
        company_id: companyId,
        level: { contains: q, mode: "insensitive" },
      },
      select: { level: true },
      distinct: ["level"],
      take: 10,
    });

    res.status(200).json({
      status: "success",
      data: jobLevels.map((jl) => jl.level).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};

export const getFieldOfStudySuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = req.query.q as string;

    const fields = await prisma.fieldOfStudy.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      select: { name: true },
      take: 10,
    });

    res.status(200).json({
      status: "success",
      data: fields.map((f) => f.name),
    });
  } catch (error) {
    next(error);
  }
};

export const getInstitutionSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const q = req.query.q as string;

    const institutions = await prisma.institution.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      select: { name: true },
      take: 10,
    });

    res.status(200).json({
      status: "success",
      data: institutions.map((i) => i.name),
    });
  } catch (error) {
    next(error);
  }
};
