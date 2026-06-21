const nodemailer = require('nodemailer');

let transporter;

function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST
    && process.env.SMTP_FROM
  );
}

function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || '',
      } : undefined,
    });
  }

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    throw new Error('Email is not configured. Set SMTP_HOST and SMTP_FROM.');
  }

  return mailer.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  isEmailConfigured,
  sendMail,
};
