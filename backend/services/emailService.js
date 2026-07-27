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

const templates = {
  bookingConfirmation: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Booking Confirmed</h2>
      <p>Hi ${escapeHtml(data.userName)},</p>
      <p>Your booking has been confirmed.</p>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Vehicle:</strong> ${escapeHtml(data.bikeName)}</p>
        <p><strong>Date:</strong> ${escapeHtml(data.date)}</p>
        <p><strong>Duration:</strong> ${escapeHtml(data.hours)} hours</p>
        <p><strong>Total:</strong> ${escapeHtml(data.totalPrice)} TK</p>
        <p><strong>Advance Paid:</strong> ${escapeHtml(data.advancePaid)} TK</p>
      </div>
      <p>Thank you for choosing Rent Bike Cox's Bazar!</p>
    </div>
  `,
  paymentConfirmation: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Payment Received</h2>
      <p>Hi ${escapeHtml(data.userName)},</p>
      <p>We have received your payment of <strong>${escapeHtml(data.amount)} TK</strong>.</p>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Booking ID:</strong> ${escapeHtml(data.bookingId)}</p>
        <p><strong>Amount:</strong> ${escapeHtml(data.amount)} TK</p>
        <p><strong>Transaction ID:</strong> ${escapeHtml(data.tranId || 'N/A')}</p>
      </div>
    </div>
  `,
  bookingCancellation: (data) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">Booking Cancelled</h2>
      <p>Hi ${escapeHtml(data.userName)},</p>
      <p>Your booking has been cancelled.</p>
      ${data.refundAmount ? `<p>Refund amount: <strong>${escapeHtml(data.refundAmount)} TK</strong> will be credited within 3-5 business days.</p>` : ''}
    </div>
  `,
};

module.exports = { sendEmail, templates };
