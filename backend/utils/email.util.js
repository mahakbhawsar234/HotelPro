const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'HotelPro <noreply@hotelpro.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Email templates
const emailTemplates = {
  bookingConfirmation: (booking, user, room, hotel) => ({
    subject: `Booking Confirmed - ${booking.bookingRef} | HotelPro`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center;">
          <h1 style="color: #f5c518; margin: 0; font-size: 28px;">🏨 HotelPro</h1>
          <p style="color: #fff; margin: 5px 0;">Your booking is confirmed!</p>
        </div>
        <div style="padding: 30px; background: #fff;">
          <h2 style="color: #1a1a2e;">Hello ${user.firstName}! 🎉</h2>
          <p style="color: #666;">Your reservation has been confirmed. Here are the details:</p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Booking Ref:</td><td style="padding: 8px; color: #1a1a2e; font-weight: bold;">${booking.bookingRef}</td></tr>
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Hotel:</td><td style="padding: 8px;">${hotel.name}</td></tr>
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Room:</td><td style="padding: 8px;">${room.category} - Room ${room.roomNumber}</td></tr>
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Check-In:</td><td style="padding: 8px;">${new Date(booking.checkInDate).toDateString()}</td></tr>
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Check-Out:</td><td style="padding: 8px;">${new Date(booking.checkOutDate).toDateString()}</td></tr>
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Nights:</td><td style="padding: 8px;">${booking.numberOfNights}</td></tr>
              <tr><td style="padding: 8px; color: #666; font-weight: bold;">Total Amount:</td><td style="padding: 8px; color: #f5c518; font-weight: bold;">₹${booking.totalAmount.toLocaleString()}</td></tr>
            </table>
          </div>
          <p style="color: #666; font-size: 14px;">Check-in time: ${hotel.checkInTime} | Check-out time: ${hotel.checkOutTime}</p>
        </div>
        <div style="background: #1a1a2e; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">© 2024 HotelPro. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  welcomeEmail: (user, verificationUrl) => ({
    subject: 'Welcome to HotelPro – Please Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center;">
          <h1 style="color: #f5c518; margin: 0;">🏨 HotelPro</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Welcome, ${user.firstName}!</h2>
          <p>Thank you for joining HotelPro. Please verify your email address to get started.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #f5c518; color: #1a1a2e; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Verify Email Address</a>
          </div>
          <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (user, resetUrl) => ({
    subject: 'Password Reset Request – HotelPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center;">
          <h1 style="color: #f5c518; margin: 0;">🏨 HotelPro</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Reset Your Password</h2>
          <p>Hi ${user.firstName}, we received a request to reset your password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #dc3545; color: #fff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Reset Password</a>
          </div>
          <p style="color: #999; font-size: 12px;">This link expires in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  }),

  cancellationConfirmation: (booking, user, hotel) => ({
    subject: `Booking Cancelled – ${booking.bookingRef} | HotelPro`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">🏨 HotelPro</h1>
          <p style="color: #fff;">Booking Cancelled</p>
        </div>
        <div style="padding: 30px;">
          <h2>Hi ${user.firstName},</h2>
          <p>Your booking <strong>${booking.bookingRef}</strong> at <strong>${hotel.name}</strong> has been cancelled.</p>
          <p>If you paid online, a refund will be processed within 5-7 business days.</p>
          <p>We hope to see you again at HotelPro!</p>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
