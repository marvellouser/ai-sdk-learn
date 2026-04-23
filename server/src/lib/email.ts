import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

type SendEmailOptions = {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
};

function getMissingSmtpKeys() {
  const missing: string[] = [];
  if (!env.SMTP_HOST) missing.push('SMTP_HOST');
  if (!env.SMTP_PORT) missing.push('SMTP_PORT');
  if (typeof env.SMTP_SECURE !== 'boolean') missing.push('SMTP_SECURE');
  if (!env.SMTP_USER) missing.push('SMTP_USER');
  if (!env.SMTP_PASS) missing.push('SMTP_PASS');
  if (!env.SMTP_FROM) missing.push('SMTP_FROM');

  return missing;
}

export function assertSmtpConfigured() {
  const missing = getMissingSmtpKeys();
  if (missing.length > 0) {
    throw new Error(`SMTP 配置不完整，缺少: ${missing.join(', ')}`);
  }
}

export async function sendEmailWithSmtp(options: SendEmailOptions) {
  assertSmtpConfigured();

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: options.toEmail,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}
