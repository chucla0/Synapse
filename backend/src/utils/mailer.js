const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.synapse.daw.inspedralbes.cat',
  port: 465, // Using port 465 (SMTPS)
  secure: true, // Must be true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // We use rejectUnauthorized: false because the official host (mail.synapse.daw.inspedralbes.cat)
    // has an invalid SSL certificate (Let's Encrypt validation failure due to DNS restrictions).
    // This allows the connection to proceed despite the certificate error.
    rejectUnauthorized: false, 
  },
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Synapse" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  transporter,
  sendEmail,
};
