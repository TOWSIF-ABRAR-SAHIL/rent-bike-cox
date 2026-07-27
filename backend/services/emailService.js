const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured — emails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    logger.info('[EmailService] Would send email', { to, subject });
    return { sent: false, reason: 'smtp_not_configured' };
  }
  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || 'Rent Bike Cox <noreply@rentbikecox.com>',
      to,
      subject,
      html,
    });
    logger.info('[EmailService] Email sent', { to, subject, messageId: info.messageId });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    logger.error('[EmailService] Failed to send email', { to, subject, error: error.message });
    return { sent: false, reason: error.message };
  }
}

function wrapEmail(title, accentColor, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, system-ui, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 32px 40px 24px; text-align: center;">
              <div style="height: 4px; background: linear-gradient(90deg, ${accentColor}, #f59e0b); border-radius: 2px; margin-bottom: 24px;"></div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Rent Bike Cox's Bazar</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 22px; font-weight: 700; line-height: 1.3;">${title}</h2>
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 28px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                <a href="https://rentbikecox.com" style="color: #f59e0b; text-decoration: none;">rentbikecox.com</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                &#128222; 0189154443 &nbsp;|&nbsp; &#128222; 01764466757
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} Rent Bike Cox's Bazar. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const templates = {
  bookingConfirmation: (data) => {
    const remaining = parseFloat(data.totalPrice) - parseFloat(data.advancePaid);
    return wrapEmail('Booking Confirmed', '#f59e0b', `
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
      <p style="margin: 0 0 28px 0; color: #475569; font-size: 16px; line-height: 1.6;">Your booking has been confirmed successfully. Please review the details below:</p>

      <!-- Booking Summary Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Vehicle</td>
                <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.bikeName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Date</td>
                <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.date)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Duration</td>
                <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.hours)} hours</td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="border-top: 2px solid #e2e8f0; margin: 16px 0;"></div>

            <!-- Amount Breakdown -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Total Price</td>
                <td style="padding: 6px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right;">${escapeHtml(data.totalPrice)} TK</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Advance Paid</td>
                <td style="padding: 6px 0; color: #10b981; font-size: 14px; font-weight: 700; text-align: right;">${escapeHtml(data.advancePaid)} TK</td>
              </tr>
              <tr>
                <td style="padding: 8px 0 0 0; color: #1a1a2e; font-size: 16px; font-weight: 700;">Remaining</td>
                <td style="padding: 8px 0 0 0; color: #f59e0b; font-size: 16px; font-weight: 700; text-align: right;">${escapeHtml(remaining)} TK</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; color: #92400e; font-size: 14px; line-height: 1.6;">
        <strong>Next Step:</strong> Complete your payment to confirm this booking.
      </p>

      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">Thank you for choosing <strong style="color: #1a1a2e;">Rent Bike Cox's Bazar</strong>!</p>
    `);
  },

  paymentConfirmation: (data) => wrapEmail('Payment Received', '#10b981', `
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
    <p style="margin: 0 0 28px 0; color: #475569; font-size: 16px; line-height: 1.6;">Your payment has been received and confirmed.</p>

    <!-- Payment Receipt Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
      <tr>
        <td style="padding: 28px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">&#x2705;</div>
          <p style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 22px; font-weight: 700;">Payment Successful</p>

          <div style="border-top: 2px solid #e2e8f0; margin: 0 0 20px 0;"></div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: left;">Amount Paid</td>
              <td style="padding: 8px 0; color: #10b981; font-size: 18px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.amount)} TK</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: left;">Booking ID</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.bookingId)}</td>
            </tr>
            ${data.tranId ? `<tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; text-align: left;">Transaction ID</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; font-family: 'Courier New', monospace;">${escapeHtml(data.tranId)}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px 0; color: #475569; font-size: 16px; line-height: 1.6;">View your booking for more details and to manage your reservation.</p>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">Thank you for choosing <strong style="color: #1a1a2e;">Rent Bike Cox's Bazar</strong>!</p>
  `),

  bookingCancellation: (data) => {
    const hasRefund = data.refundAmount && parseFloat(data.refundAmount) > 0;
    return wrapEmail('Booking Cancelled', '#ef4444', `
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
      <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Your booking has been cancelled as requested.</p>

      <!-- Cancellation Notice -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 10px; border: 1px solid #fecaca; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px 24px;">
            <p style="margin: 0; color: #991b1b; font-size: 15px; font-weight: 700; line-height: 1.6;">&#x274C; Booking Cancelled</p>
            <p style="margin: 8px 0 0 0; color: #991b1b; font-size: 14px; line-height: 1.6;">This booking is no longer active.</p>
          </td>
        </tr>
      </table>

      ${data.reason ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Cancellation Reason</p>
            <p style="margin: 0; color: #1a1a2e; font-size: 15px; line-height: 1.6;">${escapeHtml(data.reason)}</p>
          </td>
        </tr>
      </table>` : ''}

      ${hasRefund ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px 24px;">
            <p style="margin: 0 0 12px 0; color: #1a1a2e; font-size: 16px; font-weight: 700;">Refund Details</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Refund Amount</td>
                <td style="padding: 6px 0; color: #10b981; font-size: 14px; font-weight: 700; text-align: right;">${escapeHtml(data.refundAmount)} TK</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Processing Time</td>
                <td style="padding: 6px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right;">3-5 business days</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px; color: #166534; font-size: 14px; line-height: 1.6;">
        The refund will be credited to your original payment method within 3-5 business days.
      </p>` : `
      <p style="margin: 0 0 16px 0; padding: 16px; background-color: #f8f9fa; border-left: 4px solid #94a3b8; border-radius: 4px; color: #64748b; font-size: 14px; line-height: 1.6;">
        No refund is applicable for this cancellation based on our cancellation policy.
      </p>`}

      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">We're sorry to see you go. Feel free to book with us again anytime.</p>
    `);
  },

  paymentFailed: (data) => wrapEmail('Payment Failed', '#ef4444', `
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Unfortunately, your payment could not be processed.</p>

    <!-- Failure Notice Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 10px; border: 1px solid #fecaca; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px 0; color: #991b1b; font-size: 15px; font-weight: 700;">&#x26A0;&#xFE0F; Payment Failed</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #fecaca;">Booking ID</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #fecaca;">${escapeHtml(data.bookingId)}</td>
            </tr>
            ${data.reason ? `<tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reason</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right;">${escapeHtml(data.reason)}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; color: #92400e; font-size: 14px; line-height: 1.6;">
      <strong>What to do next?</strong> Please try again or contact our support team if the issue persists.
    </p>

    <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">Reach us at: <strong style="color: #1a1a2e;">0189154443</strong> or <strong style="color: #1a1a2e;">01764466757</strong></p>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">We're here to help you complete your booking.</p>
  `),

  refundProcessed: (data) => wrapEmail('Refund Processed', '#8b5cf6', `
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">Your refund has been successfully processed.</p>

    <!-- Refund Receipt Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
      <tr>
        <td style="padding: 28px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">&#x1F4B0;</div>
          <p style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 22px; font-weight: 700;">Refund Confirmed</p>

          <div style="border-top: 2px solid #e2e8f0; margin: 0 0 20px 0;"></div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: left;">Refund Amount</td>
              <td style="padding: 8px 0; color: #8b5cf6; font-size: 18px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.refundAmount)} TK</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: left;">Booking ID</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.bookingId)}</td>
            </tr>
            ${data.refundMethod ? `<tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; text-align: left;">Refund Method</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 700; text-align: right;">${escapeHtml(data.refundMethod)}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; padding: 16px; background-color: #f5f3ff; border-left: 4px solid #8b5cf6; border-radius: 4px; color: #5b21b6; font-size: 14px; line-height: 1.6;">
      The refund will appear in your account within <strong>3-5 business days</strong>, depending on your bank or payment provider.
    </p>

    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">If you have any questions, please don't hesitate to contact us at <strong style="color: #1a1a2e;">0189154443</strong>.</p>
  `),

  passwordReset: (data) => wrapEmail('Password Reset Code', '#f59e0b', `
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
    <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Use the code below to proceed:</p>

    <!-- OTP Code Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
      <tr>
        <td style="padding: 28px; text-align: center;">
          <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
          <p style="margin: 0; color: #1a1a2e; font-size: 36px; font-weight: 700; font-family: 'Courier New', Courier, monospace; letter-spacing: 6px; background-color: #ffffff; padding: 16px; border-radius: 8px; border: 2px dashed #f59e0b;">${escapeHtml(data.otp)}</p>
        </td>
      </tr>
    </table>

    <!-- Expiry Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 10px; border: 1px solid #fed7aa; margin-bottom: 16px;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">&#x23F0; This code expires in <strong>15 minutes</strong>.</p>
        </td>
      </tr>
    </table>

    <!-- Security Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">&#x1F512; If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </td>
      </tr>
    </table>
  `),

  welcome: (data) => wrapEmail('Welcome to Rent Bike Cox\'s Bazar', '#f59e0b', `
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">Hi <strong style="color: #1a1a2e;">${escapeHtml(data.userName)}</strong>,</p>
    <p style="margin: 0 0 12px 0; color: #475569; font-size: 16px; line-height: 1.6;">Welcome to <strong style="color: #1a1a2e;">Rent Bike Cox's Bazar</strong>! We're thrilled to have you on board.</p>
    <p style="margin: 0 0 28px 0; color: #475569; font-size: 16px; line-height: 1.6;">Explore Cox's Bazar at your own pace with our wide selection of bikes, cars, and jeeps.</p>

    <!-- Welcome Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
      <tr>
        <td style="padding: 28px;">
          <p style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 16px; font-weight: 700;">Quick Links</p>

          <!-- Browse Vehicles -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td style="padding: 12px 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #f59e0b; font-size: 16px;">&#x1F697;</p>
                <p style="margin: 4px 0 0 0; color: #1a1a2e; font-size: 14px; font-weight: 700;">Browse Vehicles</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Discover our fleet of bikes, cars, and jeeps</p>
              </td>
            </tr>
          </table>

          <!-- View Policies -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
            <tr>
              <td style="padding: 12px 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #f59e0b; font-size: 16px;">&#x1F4CB;</p>
                <p style="margin: 4px 0 0 0; color: #1a1a2e; font-size: 14px; font-weight: 700;">View Policies</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Read our rental terms and cancellation rules</p>
              </td>
            </tr>
          </table>

          <!-- Contact Support -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 12px 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #f59e0b; font-size: 16px;">&#x1F4DE;</p>
                <p style="margin: 4px 0 0 0; color: #1a1a2e; font-size: 14px; font-weight: 700;">Contact Support</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Call us at 0189154443 or 01764466757</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">Happy riding! &#x1F6B2;</p>
  `),
};

module.exports = { sendEmail, templates };
