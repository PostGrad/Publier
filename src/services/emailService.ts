/**
 * Email service abstraction
 * 
 * Currently logs to console for development.
 * In production, integrate with SendGrid, AWS SES, or similar.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  sendEmail(message: EmailMessage): Promise<void>;
}

/**
 * Console email service (development only)
 * Logs emails to console instead of sending them
 */
export class ConsoleEmailService implements EmailService {
  async sendEmail(message: EmailMessage): Promise<void> {
    console.log("\n═══════════════════════════════════════════════");
    console.log("📧 EMAIL (Console Mode)");
    console.log("═══════════════════════════════════════════════");
    console.log("To:", message.to);
    console.log("Subject:", message.subject);
    console.log("───────────────────────────────────────────────");
    console.log(message.text);
    console.log("═══════════════════════════════════════════════\n");
  }
}

/**
 * Global email service instance
 * In production, swap with real implementation
 */
export const emailService: EmailService = new ConsoleEmailService();

/**
 * Email templates
 */

export function createVerificationEmail(
  email: string,
  token: string,
  baseUrl: string
): EmailMessage {
  const verificationUrl = `${baseUrl}/v1/auth/verify-email?token=${token}`;

  return {
    to: email,
    subject: "Verify your Publier account",
    text: `
Welcome to Publier!

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
Publier - Creator Publishing Platform
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 24px;">Welcome to Publier!</h1>
  
  <p>Please verify your email address by clicking the button below:</p>
  
  <div style="margin: 32px 0;">
    <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Verify Email Address
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
  
  <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  
  <p style="color: #9ca3af; font-size: 12px;">
    Publier - Creator Publishing Platform
  </p>
</body>
</html>
    `.trim(),
  };
}
