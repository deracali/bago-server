import User from '../models/userScheme.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import { Resend } from 'resend';
import Request from '../models/RequestScheme.js';

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);


// Cloudinary configuration
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// helper to upload to cloudinary
const uploadToCloudinary = async (dataUri) => {
  const result = await cloudinary.v2.uploader.upload(dataUri, {
    folder: 'user_images',
    resource_type: 'image',
    timeout: 60000,
  });
  return result.secure_url;
};

/**
 * @desc User uploads an image (with receive flag)
 * @route POST /api/user/add-image
 * @access Private
 */
 export const uploadOrUpdateImage = async (req, res) => {
   try {
     const userId = req.user._id;
     if (!mongoose.Types.ObjectId.isValid(userId)) {
       return res.status(400).json({ message: 'Invalid user ID' });
     }

     const user = await User.findById(userId);
     if (!user) return res.status(404).json({ message: 'User not found' });

     let imageUrl = null;

     // ✅ Handle both multipart or base64 uploads
     if (req.files && req.files.image) {
       const fileObj = req.files.image;
       const mime = fileObj.mimetype || 'image/jpeg';
       const base64 = fileObj.data.toString('base64');
       const dataUri = `data:${mime};base64,${base64}`;
       imageUrl = await uploadToCloudinary(dataUri);
     } else if (req.body.image) {
       const imageInput = req.body.image;
       if (/^https?:\/\//i.test(imageInput)) {
         imageUrl = imageInput;
       } else if (/^data:([a-zA-Z0-9\/+.-]+);base64,/.test(imageInput)) {
         imageUrl = await uploadToCloudinary(imageInput);
       } else {
         const dataUri = `data:image/jpeg;base64,${imageInput}`;
         imageUrl = await uploadToCloudinary(dataUri);
       }
     }

     // Validate image input
     if (!imageUrl && !user.image) {
       return res.status(400).json({ message: 'Image is required' });
     }

     // ✅ If updating, delete the old image from Cloudinary (optional)
     if (user.image && imageUrl && user.image.includes('cloudinary')) {
       try {
         const publicId = user.image.split('/').pop().split('.')[0];
         await cloudinary.v2.uploader.destroy(`user_images/${publicId}`);
       } catch (err) {
         console.warn('Failed to delete old Cloudinary image:', err.message);
       }
     }

     // ✅ Update user record
     if (imageUrl) user.image = imageUrl;
     if (req.body.receive !== undefined) {
       user.receive = req.body.receive === 'true' || req.body.receive === true;
     }

     await user.save();

     res.status(200).json({
       success: true,
       message: user.image ? 'Image updated successfully' : 'Image uploaded successfully',
       image: user.image,
       receive: user.receive,
     });
   } catch (error) {
     console.error('Image Upload/Update Error:', error);
     res.status(500).json({ message: error.message });
   }
 };






 export const signUp = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword, referralCode } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ Referral system: check if entered referral code belongs to an existing user
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referralCode;
      }
    }

    // 🔹 Create token that contains user data (not saving yet)
    const verificationToken = jwt.sign(
      { firstName, lastName, email, phone, password, referredBy },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const verifyLink = `https://bago-server.onrender.com/api/baggo/verify-email?token=${verificationToken}`;
    console.log("📩 Verification link:", verifyLink);

    // 🔹 Styled HTML (inline CSS for email clients)
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Verify your Baggo account</title>
        </head>
        <body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:32px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(90deg, #5240E8 0%, #6B5CFF 100%); padding:20px; text-align:center;">
                      <a href="${process.env.FRONTEND_URL || '#'}" target="_blank" style="text-decoration:none;">
                        <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919738/Bago_New_2_gh1gmn.png" alt="Bago" width="140" style="display:block; border:0;"/>
                      </a>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 12px; color:#111827; font-size:20px;">Welcome to Bago, ${firstName}!</h1>
                      <p style="margin:0 0 18px; color:#6b7280; font-size:14px; line-height:1.5;">
                        Thanks for signing up. To finish creating your account and secure it, please confirm your email address by clicking the button below.
                      </p>

                      <div style="text-align:center; margin:26px 0;">
                        <a href="${verifyLink}" target="_blank" style="display:inline-block; padding:12px 22px; background:#5240E8; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:700;">
                          Verify Email
                        </a>
                      </div>

                      <p style="margin:0; color:#6b7280; font-size:13px;">
                        If you didn't create this account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#fbfbfe; padding:16px 24px; text-align:center; color:#9ca3af; font-size:12px;">
                      <div style="margin-bottom:6px;">© ${new Date().getFullYear()} Bago. All rights reserved.</div>
                      <div>
                        <a href="${process.env.FRONTEND_URL || '#'}" style="color:#5240E8; text-decoration:none;">Visit Bago</a>
                        <span style="margin:0 8px; color:#d1d5db;">•</span>
                        <a href="#" style="color:#9ca3af; text-decoration:underline;">Unsubscribe</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // 🔹 Send verification email (functionality unchanged)
    const { data, error } = await resend.emails.send({
      from: "Baggo <no-reply@sendwithbago.com>",
      to: email,
      subject: "Verify your Baggo account",
      html,
    });

    if (error) {
      console.error("❌ Resend email error:", error);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    console.log("✅ Verification email sent via Resend:", data);
    res.status(200).json({ message: "Verification email sent. Please check your inbox." });
  } catch (error) {
    console.error("🔥 Signup error:", error);
    res.status(400).json({ message: error.message });
  }
};



export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res
        .status(400)
        .send("<h2 style='color:red;text-align:center'>Missing token</h2>");

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if email is already verified
    const existingUser = await User.findOne({ email: decoded.email });
    if (existingUser) {
      return res.send(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <title>Email Already Verified</title>
          </head>
          <body style="background:#f3f4f6; font-family:Arial,sans-serif; text-align:center; padding:60px;">
            <div style="background:#fff; max-width:480px; margin:auto; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,0.08); padding:40px;">
              <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919726/Bago_New_5_lmj6a4.png" alt="Bago" width="120" style="margin-bottom:20px"/>
              <h2 style="color:#4F46E5;">Email Already Verified</h2>
              <p style="color:#6B7280;">This email is already registered and verified.</p>
              <a href="https://sendwithbago.com/" style="display:inline-block; margin-top:20px; background:#4F46E5; color:#fff; padding:12px 22px; border-radius:6px; text-decoration:none;">Go to App</a>
            </div>
          </body>
        </html>
      `);
    }

    // Save verified user (no manual hashing here)
    const newUser = new User({
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email,
      phone: decoded.phone,
      password: decoded.password, // plain text (will be hashed in pre-save)
      referredBy: decoded.referredBy || null,
      emailVerified: true,
    });
    await newUser.save(); // your pre-save hook will hash automatically

    // ✅ Styled success page
    return res.send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Email Verified</title>
        </head>
        <body style="background:#f3f4f6; font-family:Arial,sans-serif; text-align:center; padding:60px;">
          <div style="background:#fff; max-width:480px; margin:auto; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,0.08); padding:40px;">
            <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919726/Bago_New_5_lmj6a4.png" alt="Bago" width="120" style="margin-bottom:20px"/>
            <h2 style="color:#4F46E5;">Your Email Has Been Verified 🎉</h2>
            <p style="color:#6B7280;">Your account has been created successfully. You can now log in to your Baggo account.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Email verification error:", error);

    // Expired/invalid token page
    return res.status(400).send(`
      <!doctype html>
      <html>
        <head><meta charset="utf-8"/><title>Invalid or Expired Link</title></head>
        <body style="background:#f3f4f6; font-family:Arial,sans-serif; text-align:center; padding:60px;">
          <div style="background:#fff; max-width:480px; margin:auto; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,0.08); padding:40px;">
            <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919726/Bago_New_5_lmj6a4.png" alt="Bago" width="120" style="margin-bottom:20px"/>
            <h2 style="color:#DC2626;">Invalid or Expired Link</h2>
            <p style="color:#6B7280;">Your verification link has expired or is invalid. Please sign up again.</p>

          </div>
        </body>
      </html>
    `);
  }
};

export const createDelivery = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let finalAmount = amount;

    // ✅ Apply 3% discount only once if referred
    if (user.referredBy && !user.hasUsedReferralDiscount) {
      const discount = 0.03 * amount;
      finalAmount = amount - discount;
      user.hasUsedReferralDiscount = true; // mark discount as used
      await user.save();
    }

    // Continue your delivery or payment logic here (e.g., create delivery record)
    return res.status(200).json({
      message: "Delivery created successfully",
      originalAmount: amount,
      finalAmount,
      discountApplied: user.referredBy ? "3%" : "None",
    });

  } catch (error) {
    console.error("Delivery error:", error);
    return res.status(500).json({ message: "Error processing delivery" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to user document
    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    await user.save();

    // Build verification URL (optional CTA in email)
    const verifyUrl = `https://sendwithbago.com/auth/verify-otp?email=${encodeURIComponent(email)}`;

    // Styled HTML for the email (UI only)
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Bago — Password Reset OTP</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f3f4f6;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%; background-color:#f3f4f6; padding:32px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.06); overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding:24px 28px; text-align:center; background:linear-gradient(90deg,#5240E8 0%, #6B5CFF 100%);">
                    <a href="https://sendwithbago.com/" target="_blank" style="text-decoration:none; display:inline-block;">
                      <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919738/Bago_New_2_gh1gmn.png" alt="Bago" width="140" style="display:block; border:0;"/>
                    </a>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 12px; font-family:Arial, sans-serif; font-size:20px; color:#111827;">Reset your Bago password</h1>
                    <p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:14px; color:#6b7280; line-height:1.5;">
                      We received a request to reset the password for <strong style="color:#111827;">${email}</strong>.
                      Use the code below to verify your identity. This code will expire in <strong>5 minutes</strong>.
                    </p>

                    <!-- OTP block -->
                    <div style="margin:22px 0; text-align:center;">
                      <div style="display:inline-block; padding:18px 28px; border-radius:10px; background:#f8fafc; border:1px solid #e6e9ef;">
                        <div style="font-family: 'Courier New', Courier, monospace; font-size:32px; letter-spacing:6px; color:#111827; font-weight:700;">
                          ${otp}
                        </div>
                        <div style="margin-top:8px; font-size:12px; color:#6b7280;">One-time passcode (OTP)</div>
                      </div>
                    </div>



                    <p style="margin:22px 0 0; font-family:Arial, sans-serif; font-size:13px; color:#6b7280; line-height:1.5;">
                      If you didn't request this, you can safely ignore this email — no changes were made to your account.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:18px 24px; background:#fbfbfe; text-align:center; font-family:Arial, sans-serif; font-size:12px; color:#9ca3af;">
                    <div style="max-width:520px; margin:0 auto;">
                      <div style="margin-bottom:6px;">Need help? Visit our <a href="https://sendwithbago.com/" style="color:#5240E8; text-decoration:none;">Help Center</a>.</div>
                      <div style="margin-top:8px;">© ${new Date().getFullYear()} Bago. All rights reserved.</div>
                      <div style="margin-top:8px;"><a href="#" style="color:#9ca3af; text-decoration:underline;">Unsubscribe</a></div>
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send OTP via Resend (functionality unchanged)
    const { error } = await resend.emails.send({
      from: 'Baggo <no-reply@sendwithbago.com>',
      to: email,
      subject: 'Password Reset OTP',
      html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('🔥 Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};




export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email });
    if (!user || !user.otp || !user.otp.code)
      return res.status(400).json({ message: 'No OTP found for this user' });

    if (user.otp.expiresAt < Date.now())
      return res.status(400).json({ message: 'OTP has expired' });

    if (user.otp.code !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });

    // ✅ Create short-lived JWT for password reset
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });

    res.status(200).json({ message: 'OTP verified', token });
  } catch (err) {
    console.error('🔥 Verify OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};




export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a fresh 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/upate OTP on user document (valid for 5 minutes)
    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    await user.save();

    // Build verification URL (optional)
    const verifyUrl = `https://sendwithbago.com/auth/verify-otp?email=${encodeURIComponent(normalizedEmail)}`;

    // Styled HTML template (UI only) — shows the new OTP
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Bago — Your OTP</title>
      </head>
      <body style="margin:0; padding:0; background:#f3f4f6;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%; padding:32px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                <tr>
                  <td style="padding:20px; text-align:center; background:linear-gradient(90deg,#5240E8 0%, #6B5CFF 100%);">
                    <a href="https://sendwithbago.com/" target="_blank" style="text-decoration:none;">
                      <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919738/Bago_New_2_gh1gmn.png" alt="Bago" width="140" style="display:block; border:0;" />
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px; font-family:Arial, sans-serif; font-size:20px; color:#111827;">Your Bago OTP</h1>
                    <p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:14px; color:#6b7280;">
                      We received a request to send a new one-time passcode for <strong style="color:#111827;">${normalizedEmail}</strong>.
                      Use the code below to complete verification. It will expire in <strong>5 minutes</strong>.
                    </p>

                    <div style="margin:22px 0; text-align:center;">
                      <div style="display:inline-block; padding:18px 28px; border-radius:10px; background:#f8fafc; border:1px solid #e6e9ef;">
                        <div style="font-family:'Courier New',Courier,monospace; font-size:32px; letter-spacing:6px; color:#111827; font-weight:700;">
                          ${otp}
                        </div>
                        <div style="margin-top:8px; font-size:12px; color:#6b7280;">One-time passcode (OTP)</div>
                      </div>
                    </div>

                    <div style="text-align:center; margin-top:18px;">
                      <a href="${verifyUrl}" target="_blank" style="display:inline-block; padding:12px 22px; background:#5240E8; color:#fff; border-radius:8px; text-decoration:none; font-weight:700;">
                        Verify OTP
                      </a>
                    </div>

                    <p style="margin:22px 0 0; font-family:Arial, sans-serif; font-size:13px; color:#6b7280;">
                      If you didn't request this, you can ignore this email and no changes will be made.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px; background:#fbfbfe; text-align:center; font-family:Arial, sans-serif; font-size:12px; color:#9ca3af;">
                    <div>Need help? Visit <a href="https://sendwithbago.com/" style="color:#5240E8; text-decoration:none;">Help Center</a>.</div>
                    <div style="margin-top:6px;">© ${new Date().getFullYear()} Bago</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send via Resend (same pattern you used)
    const { error } = await resend.emails.send({
      from: "Baggo <no-reply@sendwithbago.com>",
      to: normalizedEmail,
      subject: "Your Bago OTP — Resent",
      html,
    });

    if (error) {
      console.error("❌ Resend error (resendOtp):", error);
      return res.status(500).json({ message: "Failed to resend OTP email" });
    }

    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("🔥 resendOtp error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Assign raw password — pre('save') will hash it exactly once
    user.password = newPassword;
    user.otp = undefined; // clear OTP after reset
    await user.save();

    // Debug: log hashed password that was saved
    console.log('Password saved for', normalizedEmail, '-> stored hash:', user.password);

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('🔥 Reset password error:', err);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
};


export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email }, // Use 'id' to match isAuthenticated
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(200).json({
      message: 'Sign-in successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



 export const  getUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  }
  catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};




export const edit = async (req, res, next) => {
  const userId = req.user._id;
  const updates = req.body;

  try {

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }


    const allowedUpdates = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dateOfBirth',
      'Address',
      'password',
      'status',
    ];

    const updateKeys = Object.keys(updates);
    const isValidOperation = updateKeys.every((key) => allowedUpdates.includes(key));
    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid update fields' });
    }


    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Apply updates
    updateKeys.forEach((key) => {
      user[key] = updates[key];
    });

    // Save the updated user (triggers schema validations and password hashing)
    const updatedUser = await user.save();

    // Return the updated user without the password
    const { password, ...userWithoutPassword } = updatedUser.toObject();
    return res.status(200).json({
      status: 'success',
      data: userWithoutPassword,
    });
  } catch (error) {
    // Pass error to Express error-handling middleware
    next(error);
  }
};






/**
 * @desc Add funds to user's wallet
 */
export const addFunds = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request: userId and positive amount required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update balance
    user.balance += amount;

    // Add history record
    user.balanceHistory.push({
      type: "add",
      amount,
      description: description || "Funds added",
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Funds added successfully",
      balance: user.balance,
    });
  } catch (error) {
    console.error("Add Funds Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Withdraw funds from user's wallet
 */
export const withdrawFunds = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request: userId and positive amount required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct amount
    user.balance -= amount;

    // Add history record
    user.balanceHistory.push({
      type: "withdraw",
      amount,
      description: description || "Funds withdrawn",
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal successful",
      balance: user.balance,
    });
  } catch (error) {
    console.error("Withdraw Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get user's wallet balance and history
 */
export const getWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("balance balanceHistory firstName lastName email");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      success: true,
      balance: user.balance,
      history: user.balanceHistory.sort((a, b) => b.date - a.date), // newest first
    });
  } catch (error) {
    console.error("Get Wallet Error:", error);
    res.status(500).json({ message: error.message });
  }
};



/**
 * @desc Move funds from user's balance into escrow
 * @route POST /api/user/send-to-escrow
 */
export const sendToEscrow = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request: userId and positive amount required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Deduct from main balance
    user.balance -= amount;
    // Add to escrow
    user.escrowBalance += amount;

    // Record transaction
    user.balanceHistory.push({
      type: "withdrawal",
      amount,
      description: description || "Funds moved to escrow",
    });
    user.escrowHistory.push({
      type: "escrow_hold",
      amount,
      description: description || "Held in escrow",
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Funds successfully moved to escrow",
      balance: user.balance,
      escrowBalance: user.escrowBalance,
    });
  } catch (error) {
    console.error("Escrow Error:", error);
    res.status(500).json({ message: error.message });
  }
};





/**
 * @desc Release funds from escrow into user's main balance
 * @route POST /api/user/release-from-escrow
 */
export const releaseFromEscrow = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request: userId and positive amount required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check sufficient escrow balance
    if (user.escrowBalance < amount) {
      return res.status(400).json({ message: "Insufficient escrow balance" });
    }

    // Deduct from escrow
    user.escrowBalance -= amount;
    // Add to main balance
    user.balance += amount;

    // Record transactions
    user.escrowHistory.push({
      type: "escrow_release",
      amount,
      description: description || "Funds released from escrow",
    });
    user.balanceHistory.push({
      type: "deposit",
      amount,
      description: description || "Funds added from escrow",
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Funds released from escrow successfully",
      balance: user.balance,
      escrowBalance: user.escrowBalance,
    });
  } catch (error) {
    console.error("Escrow Release Error:", error);
    res.status(500).json({ message: error.message });
  }
};










/**
 * @desc Add funds directly to escrow (no description)
 * @route POST /api/user/add-to-escrow
 * @access Private/Admin/System
 */
 export const addToEscrow = async (req, res) => {
   try {
     const { userId, amount } = req.body;

     console.log("🟢 Incoming Escrow Request:", req.body);

     if (!userId || !amount || amount <= 0) {
       console.log("⚠️ Invalid request data:", { userId, amount });
       return res
         .status(400)
         .json({ message: "Invalid request: userId and positive amount required" });
     }

     console.log("🔍 Finding user with ID:", userId);
     const user = await User.findById(userId);

     if (!user) {
       console.log("❌ User not found for ID:", userId);
       return res.status(404).json({ message: "User not found" });
     }

     console.log("💰 Current escrowBalance before update:", user.escrowBalance);
     console.log("💰 Current balance before update:", user.balance);

     // ✅ Add funds to escrow
     user.escrowBalance += amount;

     console.log("✅ New escrowBalance after update:", user.escrowBalance);

     // ✅ Record transaction
     user.escrowHistory.push({
       type: "escrow_hold", // make sure this matches your schema enum
       amount,
       date: new Date(),
     });

     console.log("🧾 Updated escrowHistory:", user.escrowHistory[user.escrowHistory.length - 1]);

     await user.save();
     console.log("💾 User saved successfully to database");

     res.status(200).json({
       success: true,
       message: "Funds successfully added to escrow",
       escrowBalance: user.escrowBalance,
     });
   } catch (error) {
     console.error("🔥 Add to Escrow Error:", error.message);
     console.error("📜 Full Error Stack:", error);
     res.status(500).json({ message: error.message });
   }
 };






 export const handleCancelledRequestEscrow = async (req, res) => {
   try {
     const { requestId, description } = req.body;

     if (!requestId) {
       return res.status(400).json({ message: "requestId is required" });
     }

     // Find the request
     const request = await Request.findById(requestId).populate("sender");
     if (!request) {
       return res.status(404).json({ message: "Request not found" });
     }

     const user = request.sender;
     if (!user) return res.status(404).json({ message: "Sender not found" });

     // Only cancel if not already cancelled
     if (request.status === "cancelled") {
       return res.status(400).json({ message: "Request is already cancelled" });
     }

     // Update status to cancelled
     request.status = "cancelled";
     await request.save();

     // Deduct escrow if any
     const escrowAmount = request.amount || 0;
     if (escrowAmount > 0) {
       if (user.escrowBalance < escrowAmount) {
         return res.status(400).json({ message: "User escrow balance insufficient" });
       }

       user.escrowBalance -= escrowAmount;
       user.escrowHistory.push({
         type: "escrow_removed",
         amount: escrowAmount,
         description: description || `Removed escrow for cancelled request ${requestId}`,
       });

       await user.save();

       // Optional: mark escrow cleared on request
       request.escrowCleared = true;
       await request.save();
     }

     res.status(200).json({
       success: true,
       message: `Request cancelled and escrow of ${escrowAmount} removed`,
       escrowBalance: user.escrowBalance,
     });

   } catch (error) {
     console.error("Escrow removal error:", error);
     res.status(500).json({ message: error.message });
   }
 };





 export const useReferralDiscount = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already used
    if (user.hasUsedReferralDiscount) {
      return res.status(400).json({ message: "Referral discount already used" });
    }

    // Update flag
    user.hasUsedReferralDiscount = true;
    await user.save();

    res.status(200).json({ message: "Referral discount marked as used", hasUsedReferralDiscount: true });
  } catch (error) {
    console.error("❌ Error updating referral discount:", error);
    res.status(500).json({ message: "Server error" });
  }
};
