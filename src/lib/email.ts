import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    .header {
      background-color: #059669;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      color: #0f172a;
      font-size: 20px;
      margin-top: 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #059669;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
    }
    .warning {
      font-size: 14px;
      color: #64748b;
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px 10px;
        border-radius: 6px;
      }
      .content {
        padding: 24px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SR Tradelink</h1>
    </div>
    <div class="content">
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your SR Tradelink account. If you made this request, please click the button below to set a new password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      
      <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; color: #059669; font-size: 14px;">
        <a href="${resetUrl}" style="color: #059669;">${resetUrl}</a>
      </p>
      
      <div class="warning">
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} SR Tradelink. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from: `"SR Tradelink" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your SR Tradelink password",
    html: htmlContent,
  });
}
