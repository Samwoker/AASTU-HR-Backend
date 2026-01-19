import { Request, Response, NextFunction } from "express";
import { prisma } from "src/app";

export const countDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const count = await prisma.department.count({
      where: {
        company_id: companyId,
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        count,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const { name } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide all required fields: name",
      });
    }

    // Verify Employee Exists
    let department = await prisma.department.findUnique({
      where: {
        company_id_name: {
          company_id: companyId,
          name: name,
        },
      },
    });

    if (department) {
      return res.status(409).json({
        status: "fail",
        message: "department already exists",
      });
    }

    department = await prisma.department.create({
      data: {
        company_id: companyId,
        name: name,
      },
    });

    res.status(201).json({
      status: "success",
      message: "department created created successfully",
      data: {
        department,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id
      ? Number(req.query.company_id)
      : undefined;

    const whereClause: any = {};
    if (companyId) {
      whereClause.company_id = companyId;
    }

    const department = await prisma.department.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        company_id: true,
      },
    });

    res.status(200).json({
      status: "success",
      results: department.length,
      data: {
        department,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    const { name } = req.body;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    if (!name) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide department name",
      });
    }

    const existing = await prisma.department.findFirst({
      where: { id: Number(id), company_id: companyId },
    });

    if (!existing) {
      return res.status(404).json({
        status: "fail",
        message: "Department not found",
      });
    }

    const department = await prisma.department.update({
      where: { id: existing.id },
      data: { name },
    });

    res.status(200).json({
      status: "success",
      message: "Department updated successfully",
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID not found in user session",
      });
    }

    const existing = await prisma.department.findFirst({
      where: { id: Number(id), company_id: companyId },
    });

    if (!existing) {
      return res.status(404).json({
        status: "fail",
        message: "Department not found",
      });
    }

    await prisma.department.delete({
      where: { id: existing.id },
    });

    res.status(200).json({
      status: "success",
      message: "Department deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
