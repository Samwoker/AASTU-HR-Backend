import {
  PrismaClient,
  OnboardingStatus,
  InstitutionCategory,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  departments,
  jobTitles,
  roles,
  resources,
  allActions,
  employeePermissions,
  getLeaveTypes,
  allowanceTypes,
  educationLevels,
  fieldsOfStudy,
  institutions,
  separationReasons,
} from "./seedData";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding ...");

  // create default company
  const company = await prisma.company.upsert({
    where: { company_code: "TEST01" },
    update: {},
    create: {
      company_code: "TEST01",
      name: "Test Company",
      is_active: true,
    },
  });

  console.log(`Created company: ${company.name}`);

  // seed departments
  for (const name of departments) {
    const department = await prisma.department.upsert({
      where: {
        company_id_name: {
          company_id: company.id,
          name,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        name,
      },
    });
    console.log(`Seeded department: ${department.name}`);
  }

  // seed job titles
  for (const jt of jobTitles) {
    const jobTitle = await prisma.jobTitle.upsert({
      where: {
        company_id_title_level: {
          company_id: company.id,
          title: jt.title,
          level: jt.level ?? null,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        title: jt.title,
        level: jt.level ?? null,
      },
    });
    console.log(`Seeded job title: ${jobTitle.title} (${jobTitle.level})`);
  }

  // create roles
  const roleMap = new Map();

  for (const roleName of roles) {
    const role = await prisma.appRole.upsert({
      where: {
        company_id_name: {
          company_id: company.id,
          name: roleName,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        name: roleName,
        description: `Default ${roleName} role`,
      },
    });
    roleMap.set(roleName, role);
    console.log(`Created role: ${role.name}`);
  }

  // create resources
  const resourceMap = new Map();

  for (const res of resources) {
    const resource = await prisma.appResource.upsert({
      where: { code: res.code },
      update: {},
      create: {
        code: res.code,
        name: res.name,
      },
    });
    resourceMap.set(res.code, resource);
    console.log(`Created resource: ${resource.code}`);
  }

  // create permissions
  const adminRole = roleMap.get("Admin");
  const hrRole = roleMap.get("HR");
  const employeeRole = roleMap.get("Employee");
  const privilegedRoles = [adminRole, hrRole];

  // Grant full permissions to Admin and HR for all resources
  for (const role of privilegedRoles) {
    if (!role) continue;
    for (const res of resources) {
      const resource = resourceMap.get(res.code);
      if (!resource) continue;

      for (const action of allActions) {
        await prisma.appPermission.upsert({
          where: {
            role_id_resource_id_action: {
              role_id: role.id,
              resource_id: resource.id,
              action: action,
            },
          },
          update: {},
          create: {
            role_id: role.id,
            resource_id: resource.id,
            action: action,
          },
        });
      }
    }
    console.log(`Granted full permissions to ${role.name}`);
  }

  // Grant Employee role permissions
  if (employeeRole) {
    for (const perm of employeePermissions) {
      const resource = resourceMap.get(perm.resource);
      if (!resource) continue;

      for (const action of perm.actions) {
        await prisma.appPermission.upsert({
          where: {
            role_id_resource_id_action: {
              role_id: employeeRole.id,
              resource_id: resource.id,
              action: action,
            },
          },
          update: {},
          create: {
            role_id: employeeRole.id,
            resource_id: resource.id,
            action: action,
          },
        });
      }
      console.log(
        `Granted Employee permissions for ${perm.resource}: ${perm.actions.join(
          ", "
        )}`
      );
    }
  }

  // Create default leave types
  console.log("Creating leave types...");
  const leaveTypes = getLeaveTypes(company.id);

  for (const lt of leaveTypes) {
    const leaveType = await prisma.leaveType.upsert({
      where: {
        company_id_code: {
          company_id: company.id,
          code: lt.code,
        },
      },
      update: {},
      create: lt,
    });
    console.log(`Seeded leave type: ${leaveType.name} (${leaveType.code})`);
  }

  // Seed Allowance Types
  console.log("Seeding allowance types...");
  for (const at of allowanceTypes) {
    const allowanceType = await prisma.allowanceType.upsert({
      where: { name: at.name },
      update: {},
      create: {
        name: at.name,
        description: at.description,
        is_taxable: true, // Defaulting to true as per schema default
      },
    });
    console.log(`Seeded allowance type: ${allowanceType.name}`);
  }

  // Seed Education Levels
  console.log("Seeding education levels...");
  for (const level of educationLevels) {
    const educationLevel = await prisma.educationLevel.upsert({
      where: { name: level.name },
      update: { display_order: level.display_order },
      create: {
        name: level.name,
        display_order: level.display_order,
      },
    });
    console.log(`Seeded education level: ${educationLevel.name}`);
  }

  // Seed Fields of Study
  console.log("Seeding fields of study...");
  const fieldSeed = await prisma.fieldOfStudy.createMany({
    data: fieldsOfStudy.map((name) => ({ name })),
    skipDuplicates: true,
  });
  console.log(`Seeded fields of study (new): ${fieldSeed.count}`);

  // Seed Institutions
  console.log("Seeding institutions...");
  for (const inst of institutions) {
    const institution = await prisma.institution.upsert({
      where: { name: inst.name },
      update: {
        category: InstitutionCategory[inst.category],
      },
      create: {
        name: inst.name,
        category: InstitutionCategory[inst.category],
        is_verified: true,
      },
    });
    console.log(`Seeded institution: ${institution.name}`);
  }

  // Seed Separation Reasons
  console.log("Seeding separation reasons...");
  const sepSeed = await prisma.separationReason.createMany({
    data: separationReasons,
    skipDuplicates: true,
  });
  console.log(`Seeded separation reasons (new): ${sepSeed.count}`);

  // Create admin employee record first
  const hrDepartment = await prisma.department.findFirst({
    where: {
      company_id: company.id,
      name: "Human Resource", // Updated to match new list
    },
  });

  // Use a fallback or one of the new titles if HR Manager isn't exact
  const hrManagerJobTitle = await prisma.jobTitle.findFirst({
    where: {
      company_id: company.id,
      title: "HR Manager", // This is in my seedData as existing merged
    },
  });

  // Create admin as an employee
  const adminEmployeeId = "EMP-ADMIN";

  let adminEmployee = await prisma.employee.findFirst({
    where: {
      id: adminEmployeeId,
      company_id: company.id,
    },
  });

  if (!adminEmployee) {
    adminEmployee = await prisma.employee.create({
      data: {
        id: adminEmployeeId,
        company_id: company.id,
        full_name: "System Admin",
        gender: "Male",
        date_of_birth: new Date("1990-01-01"),
      },
    });
    console.log(`Created admin employee: ${adminEmployee.id}`);
  } else {
    console.log(`Admin employee already exists: ${adminEmployee.id}`);
  }

  // Create employment record for admin
  if (hrDepartment && hrManagerJobTitle) {
    const existingEmployment = await prisma.employment.findFirst({
      where: {
        employee_id: adminEmployeeId,
        company_id: company.id,
        is_active: true,
      },
    });

    if (!existingEmployment) {
      await prisma.employment.create({
        data: {
          employee_id: adminEmployeeId,
          company_id: company.id,
          department_id: hrDepartment.id,
          job_title_id: hrManagerJobTitle.id,
          employment_type: "Full Time",
          start_date: new Date("2020-01-01"),
          is_active: true,
        },
      });
      console.log(`Created employment record for admin`);
    } else {
      console.log(`Employment record for admin already exists`);
    }
  } else {
    console.log(
      "Skipping admin employment - HR Department or HR Manager Job Title not found"
    );
  }

  // Create admin user linked to employee
  const adminEmail = "admin@aastu.com";
  const adminPassword = "password123";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.appUser.upsert({
    where: { email: adminEmail },
    update: {
      employee_id: adminEmployeeId,
    },
    create: {
      company_id: company.id,
      employee_id: adminEmployeeId,
      email: adminEmail,
      password_hash: hashedPassword,
      role_id: adminRole?.id ?? 0,
      is_active: true,
      onboarding_status: OnboardingStatus.COMPLETED,
    },
  });

  console.log(
    `Created admin user: ${adminUser.email} (linked to employee ${adminUser.employee_id})`
  );
  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
