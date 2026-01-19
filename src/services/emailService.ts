import { sendEmail as utilSendEmail } from "src/utils/email";
import { 
  getOfferEmailHtml, 
  getWelcomeEmailHtml 
} from "src/utils/emailTemplates";

interface OfferLetterDetails {
  jobTitle: string;
  department: string;
  employmentType: string;
  startDate: string;
  grossSalary: string;
  basicSalary: string;
  allowances: { name: string; amount: string }[];
}

export const sendActivationEmail = async (
  email: string,
  token: string,
  details?: OfferLetterDetails,
  employeeName: string = "Employee" 
) => {
  const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
  const activationUrl = `${baseUrl}/setup-account/${token}`;
  
  let html: string;
  let subject: string;

  if (details) {
    subject = "Job Offer & Account Activation - Aastu";
    html = getOfferEmailHtml(
      employeeName,
      details.jobTitle,
      parseFloat(details.grossSalary) || 0,
      parseFloat(details.basicSalary) || 0,
      details.allowances.map(a => ({ name: a.name, amount: parseFloat(a.amount) || 0 })),
      details.startDate,
      activationUrl
    );
  } else {
    subject = "Activate Your Aastu Account";
    html = getWelcomeEmailHtml(employeeName, activationUrl);
  }

  try {
    await utilSendEmail({
      to: email,
      subject,
      html
    });
    console.log(`[EmailService] Activation email sent to ${email}`);
  } catch (error) {
    console.error(`[EmailService] Failed to send activation email to ${email}:`, error);
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const result = await utilSendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    return result.success;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${options.to}:`, error);
    return false;
  }
};
