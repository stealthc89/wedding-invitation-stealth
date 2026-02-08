const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.SMTP_PASS
  }
});

transporter.sendMail({
  from: 'noreply@celebratingcc.com',
  to: 'chrisdmutono@gmail.com',
  subject: 'Test Email',
  text: 'This is a test email from your wedding app'
}, (error, info) => {
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Email sent:', info.messageId);
  }
  process.exit(0);
});
