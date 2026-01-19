import express from "express";
import {
  updatePersonalInfo,
  updateContactInfo,
  updateEducation,
  updateWorkExperience,
  updateCertifications,
  updateDocuments,
  getOnboardingStatus,
} from "src/controllers/onboardingController";
import { protect } from "src/middleware/authMiddleware";

const router = express.Router();

// All onboarding routes require authentication
router.use(protect);

// Get current onboarding status and data
router.get("/status", getOnboardingStatus);

// Step 1: Personal Information
router.patch("/personal-info", updatePersonalInfo);

// Step 2: Contact Information
router.patch("/contact-info", updateContactInfo);

// Step 3: Education
router.patch("/education", updateEducation);

// Step 4: Work Experience
router.patch("/work-experience", updateWorkExperience);

// Step 5: Certifications
router.patch("/certifications", updateCertifications);

// Step 6: Documents (completes onboarding)
router.patch("/documents", updateDocuments);

export default router;
