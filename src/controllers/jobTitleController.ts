import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

export const createJobTitle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const { title, level } = req.body;

    // Validation
    if (!title || !level) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide all required fields: title, level",
      });
    }

    // Verify Employee Exists
    const jobtitle = await prisma.jobTitle.findUnique({
      where: {
        company_id_title_level: {
          company_id: companyId,
          title: title,
          level: level,
        },
      },
    });

    if (jobtitle) {
      return res.status(409).json({
        status: "fail",
        message: "job title already exists",
      });
    }

    const jobTitle = await prisma.jobTitle.create({
      data: {
        company_id: companyId,
        title: title,
        level: level,
      },
    });

    res.status(201).json({
      status: "success",
      message: "job title created created successfully",
      data: {
        jobTitle,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobTitles = async (
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

    const jobTitles = await prisma.jobTitle.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        level: true,
        company_id: true,
      },
    });

    res.status(200).json({
      status: "success",
      results: jobTitles.length,
      data: {
        jobTitles,
      },
    });
  } catch (error) {
    next(error);
  }
};
