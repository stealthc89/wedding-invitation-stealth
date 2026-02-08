#!/usr/bin/env node

/**
 * Quick test script to verify email sending works
 * Usage: node test-email.js
 */

const fs = require('fs');
const nodemailer = require('nodemailer');

// Manually load .env.local with error handling
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('❌ Error: .env.local file not found');
    console.error('\nPlease create .env.local with your email configuration:');
    console.error('  1. Copy .env.example to .env.local');
    console.error('  2. Fill in SMTP_PASS and other credentials');
    console.error('  3. Run this script again\n');
  } else {
    console.error('❌ Error reading .env.local:', error.message);
  }
  process.exit(1);
}

async function testEmail() {
  console.log('🧪 Testing email configuration...\n');

  // Check env vars
  console.log('📋 Configuration:');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✓ Set' : '✗ Missing'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM}`);
  console.log(`   BASE_URL: ${process.env.BASE_URL}\n`);

  if (!process.env.SMTP_PASS) {
    console.error('❌ SMTP_PASS not configured in .env.local');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.SMTP_PASS,
    },
  });

  // Send test email
  const testRecipient = 'chrismutono@msn.com';

  console.log(`📧 Sending test email to: ${testRecipient}...`);

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@celebratingcc.com',
      to: testRecipient,
      subject: '✅ Wedding RSVP - Email Test Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">🎉 Email Configuration Test</h1>
          <p style="font-size: 16px; color: #555;">
            Congratulations! Your wedding RSVP platform email system is working correctly.
          </p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">✓ Test Details:</h2>
            <ul style="line-height: 1.8;">
              <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>From Address:</strong> ${process.env.EMAIL_FROM}</li>
              <li><strong>Base URL:</strong> ${process.env.BASE_URL}</li>
              <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="color: #888; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            This is an automated test email from your wedding RSVP platform.<br>
            <a href="${process.env.BASE_URL}" style="color: #0066cc;">Visit your wedding website</a>
          </p>
        </div>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 Check your inbox at: ${testRecipient}`);
    console.log('\n🎉 Email system is configured correctly!\n');

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    if (error.code) console.error('   Error code:', error.code);
    process.exit(1);
  }
}

testEmail();
