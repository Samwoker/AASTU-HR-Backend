import { Request, Response, NextFunction } from "express";
import { OnboardingStatus } from "@prisma/client";
import { prisma } from "src/app";

// Helper function to get employee_id from authenticated user
const getEmployeeId = (req: Request): string | null => {
  // Get from req.user (set by auth middleware)
  return req.user?.employee_id || null;
};

// Helper function to update onboarding status
const updateOnboardingStatus = async (
  userId: number,
  status: OnboardingStatus
) => {
  await prisma.appUser.update({
    where: { id: userId },
    data: { onboarding_status: status },
  });
};

// Step 1: Update Personal Information
export const updatePersonalInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    let employeeId = getEmployeeId(req);

    // If user doesn't have employee_id yet, check if it's provided in request body
    // This allows creating employee during onboarding
    const {
      employee_id: providedEmployeeId,
      fullName,
      gender,
      dateOfBirth,
      tinNumber,
      pensionNumber,
      placeOfWork,
    } = req.body;

    // Use provided employee_id if user doesn't have one, or use existing one
    if (!employeeId && providedEmployeeId) {
      employeeId = providedEmployeeId;
    }

    if (!employeeId) {
      return res.status(400).json({
        status: "fail",
        message:
          "Employee ID is required. If your account was created with an employee ID, please ensure you're logged in correctly. Otherwise, please provide employee_id in the request body.",
      });
    }

    // Validation
    if (!fullName || !gender || !dateOfBirth) {
      return res.status(400).json({
        status: "fail",
        message:
          "Please provide all required fields: fullName, gender, dateOfBirth",
      });
    }

    // Check if employee exists or has placeholder name
    let employee = employeeId
      ? await prisma.employee.findUnique({
          where: {
            id_company_id: {
              id: employeeId,
              company_id: companyId,
            },
          },
        })
      : null;

    // Check for duplicate TIN if being updated
    if (tinNumber) {
      const existingTin = await prisma.employee.findUnique({
        where: { tin_number: tinNumber },
      });

      if (existingTin && existingTin.id !== employeeId) {
        return res.status(400).json({
          status: "fail",
          message: "TIN number already exists",
        });
      }
    }

    // Check if employee_id already exists in another company
    if (employeeId) {
      const existingEmployeeId = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, company_id: true },
      });

      if (existingEmployeeId && existingEmployeeId.company_id !== companyId) {
        return res.status(400).json({
          status: "fail",
          message: "Employee ID already exists in another company",
        });
      }
    }

    let updatedEmployee;

    if (!employee) {
      // Employee doesn't exist, create it
      updatedEmployee = await prisma.employee.create({
        data: {
          id: employeeId!,
          company_id: companyId,
          full_name: fullName,
          gender,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
          tin_number: tinNumber || null,
          pension_number: pensionNumber || null,
          place_of_work: placeOfWork || "Head Office",
        },
      });

      // Update user's employee_id if it was null
      if (!req.user?.employee_id) {
        await prisma.appUser.update({
          where: { id: userId },
          data: { employee_id: employeeId },
        });
      }
    } else {
      // Employee exists, update it (handles placeholder names too)
      updatedEmployee = await prisma.employee.update({
        where: {
          id_company_id: {
            id: employeeId!,
            company_id: companyId,
          },
        },
        data: {
          full_name: fullName,
          gender,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
          tin_number: tinNumber || null,
          pension_number: pensionNumber || null,
          place_of_work: placeOfWork || "Head Office",
        },
      });
    }

    // Do not change onboarding_status on partial step updates.

    res.status(200).json({
      status: "success",
      message: "Personal information updated successfully",
      data: {
        employee: updatedEmployee,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Step 2: Update Contact Information
export const updateContactInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Employee ID not found. Please contact administrator.",
      });
    }

    const { region, city, subCity, woreda, phones } = req.body;

    // Validation
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "At least one phone number is required",
      });
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Delete existing addresses and phones
    await prisma.employeeAddress.deleteMany({
      where: { employee_id: employeeId },
    });

    await prisma.employeePhone.deleteMany({
      where: { employee_id: employeeId },
    });

    // Create new address if provided
    if (region || city || subCity || woreda) {
      await prisma.employeeAddress.create({
        data: {
          employee_id: employeeId,
          company_id: companyId,
          region: region || null,
          city: city || null,
          sub_city: subCity || null,
          woreda: woreda || null,
        },
      });
    }

    // Create new phones
    const phoneData = phones.map((phone: any) => ({
      employee_id: employeeId,
      company_id: companyId,
      phone_number: phone.number,
      phone_type: phone.type || "Private",
      is_primary: phone.isPrimary || false,
    }));

    await prisma.employeePhone.createMany({
      data: phoneData,
    });

    // Do not change onboarding_status on partial step updates.

    // Fetch updated data
    const [addresses, phoneNumbers] = await Promise.all([
      prisma.employeeAddress.findMany({
        where: { employee_id: employeeId },
      }),
      prisma.employeePhone.findMany({
        where: { employee_id: employeeId },
        orderBy: [{ is_primary: "desc" }, { id: "asc" }],
      }),
    ]);

    res.status(200).json({
      status: "success",
      message: "Contact information updated successfully",
      data: {
        addresses,
        phones: phoneNumbers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Step 3: Update Education
export const updateEducation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Employee ID not found. Please contact administrator.",
      });
    }

    const { education } = req.body;

    if (!Array.isArray(education)) {
      return res.status(400).json({
        status: "fail",
        message: "Education must be an array",
      });
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Delete existing educations
    await prisma.employeeEducation.deleteMany({
      where: { employee_id: employeeId },
    });

    const normalizeText = (value: any) => String(value ?? "").trim();
    const normalizeProgramType = (value: any) => {
      const v = normalizeText(value);
      const allowed = new Set(["Regular", "Extension", "Weekend", "Distance"]);
      return allowed.has(v) ? (v as any) : ("Regular" as any);
    };

    const getOrCreateEducationLevel = async (nameRaw: any) => {
      const name = normalizeText(nameRaw);
      if (!name) {
        throw new Error("Education level is required");
      }

      const existing = await prisma.educationLevel.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (existing) return existing;

      try {
        return await prisma.educationLevel.create({ data: { name } });
      } catch (err: any) {
        // Handle race (or duplicates with different casing) safely
        if (err?.code === "P2002") {
          const retry = await prisma.educationLevel.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
          });
          if (retry) return retry;
        }
        throw err;
      }
    };

    const getOrCreateFieldOfStudy = async (nameRaw: any) => {
      const name = normalizeText(nameRaw);
      if (!name) {
        throw new Error("Field of study is required");
      }

      const existing = await prisma.fieldOfStudy.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (existing) return existing;

      try {
        return await prisma.fieldOfStudy.create({ data: { name } });
      } catch (err: any) {
        if (err?.code === "P2002") {
          const retry = await prisma.fieldOfStudy.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
          });
          if (retry) return retry;
        }
        throw err;
      }
    };

    const getOrCreateInstitution = async (nameRaw: any) => {
      const name = normalizeText(nameRaw);
      if (!name) {
        throw new Error("Institution is required");
      }

      const existing = await prisma.institution.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (existing) return existing;

      try {
        return await prisma.institution.create({
          data: {
            name,
            category: "Private", // default
          },
        });
      } catch (err: any) {
        if (err?.code === "P2002") {
          const retry = await prisma.institution.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
          });
          if (retry) return retry;
        }
        throw err;
      }
    };

    // Create new educations (sequential to avoid create races)
    for (const edu of education) {
      const educationLevel = await getOrCreateEducationLevel(edu?.level);
      const fieldOfStudy = await getOrCreateFieldOfStudy(edu?.fieldOfStudy);
      const institution = await getOrCreateInstitution(edu?.institution);

      await prisma.employeeEducation.create({
        data: {
          employee_id: employeeId,
          education_level_id: educationLevel.id,
          field_of_study_id: fieldOfStudy.id,
          institution_id: institution.id,
          program_type: normalizeProgramType(edu?.programType),
          has_cost_sharing: edu?.hasCostSharing === true,
          cost_sharing_document_url: edu?.costSharingDocument
            ? normalizeText(edu.costSharingDocument)
            : null,
          start_date: edu?.startDate ? new Date(edu.startDate) : null,
          end_date: edu?.endDate ? new Date(edu.endDate) : null,
          is_verified: false,
          is_current: edu?.isCurrent === true,
        },
      });
    }

    // Do not change onboarding_status on partial step updates.

    // Fetch updated educations
    const educations = await prisma.employeeEducation.findMany({
      where: { employee_id: employeeId },
      include: {
        educationLevel: true,
        fieldOfStudy: true,
        institution: true,
      },
      orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
    });

    const educationForFrontend = educations.map((e) => ({
      id: e.id,
      level: e.educationLevel?.name ?? null,
      fieldOfStudy: e.fieldOfStudy?.name ?? null,
      institution: e.institution?.name ?? null,
      programType: e.program_type,
      hasCostSharing: e.has_cost_sharing ?? false,
      costSharingDocument: e.cost_sharing_document_url ?? null,
      startDate: e.start_date,
      endDate: e.end_date,
      isCurrent: e.is_current ?? false,
      isVerified: e.is_verified ?? false,
    }));

    res.status(200).json({
      status: "success",
      message: "Education updated successfully",
      data: {
        educations: educationForFrontend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Step 4: Update Work Experience (Employment History)
export const updateWorkExperience = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Employee ID not found. Please contact administrator.",
      });
    }

    const { workExperience } = req.body;

    if (!Array.isArray(workExperience)) {
      return res.status(400).json({
        status: "fail",
        message: "Work experience must be an array",
      });
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Delete existing employment history
    await prisma.employmentHistory.deleteMany({
      where: { employee_id: employeeId },
    });

    // Create new employment history records
    const historyPromises = workExperience.map(async (exp: any) => {
      // Find job title if provided
      let jobTitle = null;
      if (exp.position) {
        jobTitle = await prisma.jobTitle.findFirst({
          where: {
            company_id: companyId,
            title: { equals: exp.position, mode: "insensitive" },
          },
        });
      }

      return prisma.employmentHistory.create({
        data: {
          employee_id: employeeId,
          previous_company_name: exp.companyName,
          job_title_id: jobTitle?.id || null,
          previous_job_title_text: exp.position || null,
          previous_level: exp.level || null,
          department_name: exp.department || null,
          start_date: exp.startDate ? new Date(exp.startDate) : new Date(),
          end_date: exp.endDate ? new Date(exp.endDate) : null,
          is_verified: false,
          notes: exp.notes || null,
        },
      });
    });

    await Promise.all(historyPromises);

    // Do not change onboarding_status on partial step updates.

    // Fetch updated employment history
    const history = await prisma.employmentHistory.findMany({
      where: { employee_id: employeeId },
      include: {
        jobTitle: true,
      },
      orderBy: { start_date: "desc" },
    });

    res.status(200).json({
      status: "success",
      message: "Work experience updated successfully",
      data: {
        workExperience: history,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Step 5: Update Certifications
export const updateCertifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Employee ID not found. Please contact administrator.",
      });
    }

    const { certifications } = req.body;

    if (!Array.isArray(certifications)) {
      return res.status(400).json({
        status: "fail",
        message: "Certifications must be an array",
      });
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Delete existing certifications
    await prisma.employeeLicensesAndCertifications.deleteMany({
      where: { employee_id: employeeId },
    });

    // Create new certifications
    const certificationPromises = certifications.map((cert: any) =>
      prisma.employeeLicensesAndCertifications.create({
        data: {
          employee_id: employeeId,
          name: cert.name,
          issuing_organization: cert.issuingOrganization || null,
          issue_date: cert.issueDate ? new Date(cert.issueDate) : null,
          expiration_date: cert.expirationDate
            ? new Date(cert.expirationDate)
            : null,
          credential_id: cert.credentialId || null,
          credential_url: cert.certificateDocument || null,
        },
      })
    );

    await Promise.all(certificationPromises);

    // Do not change onboarding_status on partial step updates.

    // Fetch updated certifications
    const certs = await prisma.employeeLicensesAndCertifications.findMany({
      where: { employee_id: employeeId },
      orderBy: { issue_date: "desc" },
    });

    res.status(200).json({
      status: "success",
      message: "Certifications updated successfully",
      data: {
        certifications: certs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Step 6: Update Documents (and Complete Onboarding)
export const updateDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({
        status: "fail",
        message: "Employee ID not found. Please contact administrator.",
      });
    }

    const { documents } = req.body as {
      documents?: {
        cv?: string[];
        certificates?: string[];
        photo?: string[];
        experienceLetters?: string[];
        taxForms?: string[];
        pensionForms?: string[];
      };
    };

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    // Persist submitted document URLs (arrays of strings per category)
    await prisma.employeeDocument.upsert({
      where: {
        employee_id_company_id: {
          employee_id: employeeId,
          company_id: companyId,
        },
      },
      update: {
        cv: documents?.cv ?? [],
        certificates: documents?.certificates ?? [],
        photo: documents?.photo ?? [],
        experienceLetters: documents?.experienceLetters ?? [],
        taxForms: documents?.taxForms ?? [],
        pensionForms: documents?.pensionForms ?? [],
      },
      create: {
        employee_id: employeeId,
        company_id: companyId,
        cv: documents?.cv ?? [],
        certificates: documents?.certificates ?? [],
        photo: documents?.photo ?? [],
        experienceLetters: documents?.experienceLetters ?? [],
        taxForms: documents?.taxForms ?? [],
        pensionForms: documents?.pensionForms ?? [],
      },
    });

    // After documents submission, onboarding is marked PENDING_APPROVAL for admin/HR review.

    // Update onboarding status to PENDING_APPROVAL
    await updateOnboardingStatus(userId, OnboardingStatus.PENDING_APPROVAL);

    res.status(200).json({
      status: "success",
      message: "Documents uploaded and onboarding submitted for approval",
      data: {
        documents: documents || {},
        onboarding_status: OnboardingStatus.PENDING_APPROVAL,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current onboarding status and data
export const getOnboardingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.company_id;
    const userId = parseInt(req.user?.user_id || "0");

    if (!companyId || !userId) {
      return res.status(400).json({
        status: "fail",
        message: "Company ID or User ID not found in session",
      });
    }

    // Get user with onboarding status
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { onboarding_status: true, employee_id: true },
    });

    const employeeId = getEmployeeId(req);

    // If user doesn't have an employee_id yet, return status indicating onboarding hasn't started
    if (!employeeId || !user?.employee_id) {
      return res.status(200).json({
        status: "success",
        data: {
          onboarding_status: user?.onboarding_status || "PENDING",
          employee: null,
          contact: {
            addresses: [],
            phones: [],
          },
          education: [],
          workExperience: [],
          certifications: [],
          message:
            "Employee record not created yet. Please complete Step 1 (Personal Information) to create your employee profile.",
        },
      });
    }

    // Get employee data
    const employee = await prisma.employee.findUnique({
      where: {
        id_company_id: {
          id: employeeId,
          company_id: companyId,
        },
      },
      include: {
        addresses: true,
        phones: true,
        documents: true,
        educations: {
          include: {
            educationLevel: true,
            fieldOfStudy: true,
            institution: true,
          },
        },
        employmentHistories: {
          include: {
            jobTitle: true,
          },
        },
        licensesAndCertifications: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "Employee not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        onboarding_status: user?.onboarding_status || "PENDING",
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          gender: employee.gender,
          date_of_birth: employee.date_of_birth,
          tin_number: employee.tin_number,
          pension_number: employee.pension_number,
          place_of_work: employee.place_of_work,
        },
        documents: {
          cv: employee.documents?.cv ?? [],
          certificates: employee.documents?.certificates ?? [],
          photo: employee.documents?.photo ?? [],
          experienceLetters: employee.documents?.experienceLetters ?? [],
          taxForms: employee.documents?.taxForms ?? [],
          pensionForms: employee.documents?.pensionForms ?? [],
        },
        contact: {
          addresses: employee.addresses,
          phones: employee.phones,
        },
        education: employee.educations.map((e) => ({
          id: e.id,
          level: e.educationLevel?.name ?? null,
          fieldOfStudy: e.fieldOfStudy?.name ?? null,
          institution: e.institution?.name ?? null,
          programType: e.program_type,
          hasCostSharing: e.has_cost_sharing ?? false,
          costSharingDocument: e.cost_sharing_document_url ?? null,
          startDate: e.start_date,
          endDate: e.end_date,
          isCurrent: e.is_current ?? false,
          isVerified: e.is_verified ?? false,
        })),
        workExperience: employee.employmentHistories.map((h) => ({
          id: h.id,
          employee_id: h.employee_id,
          previousCompanyName: h.previous_company_name,
          jobTitle: h.jobTitle?.title ?? h.previous_job_title_text ?? null,
          previousLevel: h.previous_level ?? null,
          departmentName: h.department_name ?? null,
          startDate: h.start_date,
          endDate: h.end_date,
          isVerified: h.is_verified ?? false,
          notes: h.notes ?? null,
        })),
        certifications: employee.licensesAndCertifications,
      },
    });
  } catch (error) {
    next(error);
  }
};
