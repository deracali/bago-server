import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import { connection } from './db/database.js';
import userRouter from './routers/userRouters.js';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { messageController } from './controllers/MessageController.js';
import AdminRouter from './AdminRouter/AdminRouter.js';
import Stripe from 'stripe';
import priceRoutes from "./AdminRouter/priceperkgRoute.js";
import User from './models/userScheme.js'; // ✅ ensure correct path
import { Expo } from 'expo-server-sdk';
import { Resend } from 'resend';
import { startEscrowAutoRelease } from './cron/escrowCron.js'



dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const expo = new Expo();
const resend = new Resend(process.env.RESEND_API_KEY);
startEscrowAutoRelease();

// create or return an existing Stripe account id for a user
async function createStripeAccountForUser(user) {
  if (!user) throw new Error('User required');

  if (user.stripeAccountId) return user.stripeAccountId;

  const account = await stripe.accounts.create({
    type: 'express',                  // or 'standard' / 'custom' depending on your model
    email: user.email,
    capabilities: { transfers: { requested: true } },
  });

  user.stripeAccountId = account.id;
  await user.save();

  console.log(`Created Stripe account ${account.id} for user ${user._id}`);
  return account.id;
}



// ✅ Middleware setup
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json({ limit: '10000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));
app.use(cookieParser());

// ✅ Make io accessible to routers
app.set('io', io);

// ✅ Initialize Socket.IO message controller
messageController(io);

// ✅ Main Routes
app.use('/api/baggo', userRouter);
app.use('/api/Adminbaggo', AdminRouter);
app.use("/api/prices", priceRoutes);


// ✅ Stripe Payment Intent Route (Standard Payment)
app.post('/api/payment/create-intent', async (req, res) => {
  const { amount, travellerName, travellerEmail } = req.body;
  try {
    if (!amount) {
      return res.status(400).json({ error: 'Missing required parameter: amount.' });
    }

    const stripeAmount = Math.round(Number(amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: 'usd',
      metadata: { travellerName, travellerEmail },
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({
      success: true,
      data: { clientSecret: paymentIntent.client_secret },
    });
  } catch (error) {
    console.error('❌ Stripe Payment Intent Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// ✅ STRIPE CONNECT - Onboarding
app.post('/api/stripe/connect/onboard', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ success:false, message: 'userId and email are required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message: 'User not found' });

    // create or reuse connected account
    const stripeAccountId = await createStripeAccountForUser(user);

    // create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      return_url: `${process.env.BASE_URL}/api/stripe/onboarding/complete?userId=${userId}`,
  refresh_url: `${process.env.BASE_URL}/api/stripe/onboarding/refresh?userId=${userId}`,
      type: 'account_onboarding',
    });

    res.json({ success: true, url: accountLink.url });
  } catch (error) {
    console.error('❌ Stripe Onboarding Error:', error);
    res.status(500).json({ success:false, message: error.message || 'Server error' });
  }
});




// ✅ STRIPE CONNECT - Onboarding Complete
app.get('/api/stripe/onboarding/complete', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).send('Missing userId');

    const user = await User.findById(userId);
    if (!user || !user.stripeAccountId)
      return res.status(404).send('User or Stripe account not found');

    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // ✅ Check onboarding completion
    const verified = account.details_submitted && account.charges_enabled;

    user.stripeVerified = verified;
    await user.save();

    console.log(`✅ Stripe onboarding completed for user ${user.email}`);

    res.send(`
       <html>
         <head>
           <title>Stripe Onboarding Complete</title>
           <style>
             body {
               font-family: Arial, sans-serif;
               background-color: #f9fafb;
               color: #111827;
               display: flex;
               flex-direction: column;
               align-items: center;
               justify-content: center;
               height: 100vh;
               text-align: center;
             }
             h2 {
               color: #16a34a;
               font-size: 1.8rem;
             }
             p {
               font-size: 1rem;
               margin-top: 10px;
               color: #374151;
             }
           </style>
         </head>
         <body>
           <h2>✅ Stripe Onboarding Completed Successfully!</h2>
           <p>You can now close this window and return to the app.</p>
         </body>
       </html>
     `);

  } catch (error) {
    console.error('❌ Stripe Onboarding Complete Error:', error);
    res.status(500).send('Error completing onboarding.');
  }
});


// ⚠️ STRIPE CONNECT - Onboarding Refresh (expired/cancelled)
app.get('/api/stripe/onboarding/refresh', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).send('Missing userId');

    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    user.stripeVerified = false;
    await user.save();

    console.log(`⚠️ Stripe onboarding refresh triggered for user ${user.email}`);

    res.send(`
      <h2>⚠️ Onboarding session expired or canceled.</h2>
      <p>Please return to the app and restart the onboarding process.</p>
    `);
  } catch (error) {
    console.error('❌ Stripe Onboarding Refresh Error:', error);
    res.status(500).send('Error handling onboarding refresh.');
  }
});



// ✅ STRIPE CONNECT - Check Account Status & Save Verification
app.get('/api/stripe/connect/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user?.stripeAccountId)
      return res.status(400).json({ message: 'User not connected to Stripe' });

    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // ✅ Save verification & payout status in DB
    user.stripeVerified = account.charges_enabled && account.payouts_enabled;
    await user.save();

    res.json({
      success: true,
      verified: user.stripeVerified,
      account,
    });
  } catch (error) {
    console.error('❌ Stripe Status Error:', error);
    res.status(500).json({ message: error.message });
  }
});
app.get('/', async (req, res)=>{
  res.send("hello")
})

// ✅ STRIPE CONNECT - Platform Fee (10%) + Transfer to Traveller
app.post('/api/stripe/connect/transfer', async (req, res) => {
  try {
    const { userId, totalAmount } = req.body;
    if (!userId || !totalAmount)
      return res.status(400).json({ message: 'userId and totalAmount are required' });

    const user = await User.findById(userId);
    if (!user?.stripeAccountId)
      return res.status(400).json({ message: 'User not connected to Stripe' });

    // 10% platform fee → keep 10%, send 90%
    const amount = Math.round(Number(totalAmount) * 100);
    const userAmount = Math.round(amount * 0.9);
    const platformFee = amount - userAmount;

    const transfer = await stripe.transfers.create({
      amount: userAmount,
      currency: 'usd',
      destination: user.stripeAccountId,
      description: `Traveller payout for ${user.email}`,
      metadata: { platformFee: (platformFee / 100).toFixed(2) },
    });

    res.json({
      success: true,
      message: `Transfer successful. Platform fee: $${(platformFee / 100).toFixed(2)}`,
      transfer,
    });
  } catch (error) {
    console.error('❌ Stripe Transfer Error:', error);
    res.status(500).json({ message: error.message });
  }
});


// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// ✅ Database connection and server start
connection();
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});





// ✅ Register Token
app.post('/register-token', async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.pushTokens) user.pushTokens = [];

    if (!user.pushTokens.includes(token)) {
      user.pushTokens.push(token);
      await user.save();
    }

    res.json({ success: true, message: 'Token registered successfully' });
  } catch (err) {
    console.error('Register token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// ✅ Send Notification (Single User or All Users)
app.post('/send-notification', async (req, res) => {
  const { userId, title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  try {
    let users = [];

    if (userId) {
      // 🔹 Send to one specific user
      const user = await User.findById(userId);
      if (!user || !user.pushTokens?.length)
        return res.status(404).json({ error: 'No tokens for this user' });
      users = [user];
    } else {
      // 🔹 Get all users who have at least one valid Expo token
      const allUsers = await User.find({ pushTokens: { $exists: true, $ne: [] } });
      users = allUsers.filter(
        (u) =>
          Array.isArray(u.pushTokens) &&
          u.pushTokens.some((t) => Expo.isExpoPushToken(t))
      );
      if (!users.length)
        return res.status(404).json({ error: 'No users with valid push tokens' });
    }

    console.log(
      '📱 Sending to users:',
      users.map((u) => ({
        id: u._id,
        tokens: u.pushTokens,
      }))
    );

    // ✅ Collect all unique valid tokens
    const uniqueTokens = new Set();
    for (const user of users) {
      for (const token of user.pushTokens) {
        if (Expo.isExpoPushToken(token)) {
          uniqueTokens.add(token);
        }
      }
    }

    if (!uniqueTokens.size) {
      return res.status(404).json({ error: 'No valid Expo tokens to send to' });
    }

    // ✅ Group tokens by project
    const projectGroups = {};
    for (const token of uniqueTokens) {
      const projectMatch = token.match(/\[(.*?)\]/);
      const projectId = projectMatch ? projectMatch[1].split(':')[0] : 'unknown';
      if (!projectGroups[projectId]) projectGroups[projectId] = [];
      projectGroups[projectId].push(token);
    }

    const tickets = [];
    let sentCount = 0;

    // ✅ Send per project group
    for (const [projectId, tokens] of Object.entries(projectGroups)) {
      console.log(`🚀 Sending ${tokens.length} notifications for project: ${projectId}`);

      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log('📨 Ticket chunk:', ticketChunk);
          tickets.push(...ticketChunk);
          sentCount += messages.length;
        } catch (error) {
          console.error(`❌ Error sending chunk for project ${projectId}:`, error);
        }
      }
    }

    res.json({ success: true, count: sentCount, tickets });
  } catch (err) {
    console.error('Send notification error:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});





const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
if (!PAYSTACK_SECRET) console.warn("⚠️ PAYSTACK_SECRET not set");

const headers = {
  Authorization: `Bearer ${PAYSTACK_SECRET}`,
  "Content-Type": "application/json",
};

// Convert amount to kobo (Paystack requires smallest unit)
const toKobo = (amount) => Math.round(Number(amount) * 100);

// -----------------------------
// 1️⃣  LIST BANKS
// -----------------------------
// Keep both routes for safety
app.get("/banks", async (req, res) => {
  // console.log('[banks] incoming request');
  try {
    const resp = await fetch("https://api.paystack.co/bank?currency=NGN", { method: "GET", headers });
    const text = await resp.text();
    // console.log('[banks] paystack raw response status:', resp.status, 'body:', text);

    const data = JSON.parse(text);
    // Forward Paystack shape to client (makes frontend simple)
    return res.json(data);
  } catch (err) {
    console.error('[banks] error fetching paystack:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// alias route matching frontend if your frontend uses /api/paystack/banks
app.get("/api/paystack/banks", async (req, res) => {
  // console.log('[api/paystack/banks] incoming request');
  try {
    const resp = await fetch("https://api.paystack.co/bank?currency=NGN", { method: "GET", headers });
    const text = await resp.text();
    // console.log('[api/paystack/banks] paystack raw response status:', resp.status, 'body:', text);
    const data = JSON.parse(text);
    return res.json(data);
  } catch (err) {
    console.error('[api/paystack/banks] error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// -----------------------------
// 2️⃣  CREATE RECIPIENT
// -----------------------------
// server.js (or wherever your route is)
app.post("/create-recipient", async (req, res) => {
  try {
    console.log('[server] /create-recipient called with body:', req.body);

    const { userId, name, account_number, bank_code } = req.body;
    if (!userId || !name || !account_number || !bank_code) {
      console.warn('[server] missing fields:', { userId, name, account_number, bank_code });
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.warn('[server] user not found:', userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const body = {
      type: "nuban",
      name,
      account_number,
      bank_code,
      currency: "NGN",
    };

    console.log('[server] sending to paystack:', body);

    // ensure headers include your Paystack secret
    const headers = {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`, // <-- make sure this exists
      'Content-Type': 'application/json',
    };

    const resp = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const raw = await resp.text();
    console.log('[server] paystack HTTP status:', resp.status);
    console.log('[server] paystack raw response:', raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[server] failed to parse paystack response as JSON:', parseErr);
      // return useful info to client for debugging (but not secrets)
      return res.status(502).json({
        success: false,
        message: 'Invalid response from Paystack (not JSON).',
        raw: raw.slice(0, 1000), // trim long HTML for safety
      });
    }

    // If Paystack returned an error-like response
    if (!data.status) {
      console.warn('[server] paystack responded with failure:', data);
      return res.status(400).json({
        success: false,
        message: 'Paystack API error',
        paystack: data,
      });
    }

    // Save recipient code to user
    user.recipient_code = data.data.recipient_code;
    await user.save();

    // Return a consistent payload to client — include both shapes so client can handle either
    return res.json({
      success: true,
      status: true,
      recipient: data.data, // recipient resource from paystack
    });
  } catch (err) {
    console.error('[server] create-recipient exception:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



app.post("/send-otp", async (req, res) => {
  try {
    console.log("📩 Incoming /send-otp request with body:", req.body);

    const { userId } = req.body;
    if (!userId) {
      console.warn("⚠️ No userId provided in body");
      return res.status(400).json({ success: false, message: "userId required" });
    }

    const user = await User.findById(userId);
    console.log("🔍 Found user:", user ? user.email : "No user found");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min validity
    console.log("🧮 Generated OTP:", otp, "expires at:", expiresAt);

    user.otp = { code: otp, expiresAt };
    await user.save();
    console.log("💾 OTP saved for user:", user.email);

    // Check that resend instance exists
    if (!resend || !resend.emails?.send) {
      console.error("🚨 Resend instance not configured properly!");
      return res.status(500).json({ success: false, message: "Email service not configured" });
    }

    console.log("📤 Sending email to:", user.email);
    const html = `
  <!doctype html>
  <html>
  <head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bago — Withdrawal OTP</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%; background-color:#f3f4f6; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.06); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:24px 28px; text-align:center; background:linear-gradient(90deg,#5240E8 0%, #6B5CFF 100%);">
              <a href="${process.env.FRONTEND_URL || '#'}" target="_blank" style="text-decoration:none; display:inline-block;">
                <img src="https://res.cloudinary.com/dmito8es3/image/upload/v1761919738/Bago_New_2_gh1gmn.png" alt="Bago" width="140" style="display:block; border:0;"/>
              </a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px; font-family:Arial, sans-serif; font-size:20px; color:#111827;">Confirm Your Withdrawal</h1>
              <p style="margin:0 0 18px; font-family:Arial, sans-serif; font-size:14px; color:#6b7280; line-height:1.5;">
                Hi <strong style="color:#111827;">${user.name || "User"}</strong>,
                to proceed with your withdrawal request from your Bago wallet, please use the One-Time Password (OTP) below.
                This code will expire in <strong>5 minutes</strong>.
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
                Enter this OTP in the app to confirm your withdrawal. If you did not initiate this request, please ignore this message.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px; background:#fbfbfe; text-align:center; font-family:Arial, sans-serif; font-size:12px; color:#9ca3af;">
              <div style="max-width:520px; margin:0 auto;">
                <div style="margin-bottom:6px;">Need help? Visit our <a href="${process.env.FRONTEND_URL || '#'}" style="color:#5240E8; text-decoration:none;">Help Center</a>.</div>
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


    const emailResponse = await resend.emails.send({
    from: "Baggo <onboarding@resend.dev>",
    to: user.email,
    subject: "Your Withdrawal OTP Code",
    html
  });


    console.log("📨 Email API response:", emailResponse);

    res.json({ success: true, message: "OTP sent to email", debug: emailResponse });
  } catch (err) {
    console.error("❌ send-otp error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});





app.post("/verify-otp", async (req, res) => {
  try {
    const { userId, code, amount } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.otp)
      return res.status(400).json({ success: false, message: "OTP not found" });

    const { otp } = user;
    const now = new Date();

    if (now > otp.expiresAt)
      return res.status(400).json({ success: false, message: "OTP expired" });

    if (otp.code !== code)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    // OTP is valid → clear it
    user.otp = undefined;
    await user.save();

    // Proceed to Paystack transfer
    if (!user.recipient_code)
      return res.status(400).json({ success: false, message: "Recipient not set up" });

    const resp = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "balance",
        reason: "User withdrawal",
        amount: Math.round(amount * 100),
        recipient: user.recipient_code,
      }),
    });

    const data = await resp.json();
    if (!data.status) {
      return res.status(400).json({ success: false, message: data.message });
    }

    res.json({ success: true, message: "Withdrawal successful", data: data.data });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});





// -----------------------------
// 3️⃣  INITIATE TRANSFER (PAYOUT)
// -----------------------------
app.post("/transfer", async (req, res) => {
  try {
    const { userId, amount, reason = "Wallet Payout" } = req.body;
    if (!userId || !amount)
      return res.status(400).json({ success: false, message: "userId and amount required" });

    const user = await User.findById(userId);
    if (!user?.recipient_code)
      return res.status(400).json({ success: false, message: "Recipient not created yet" });

    const sendAmount = toKobo(amount);

    const body = {
      source: "balance",
      amount: sendAmount,
      recipient: user.recipient_code,
      reason,
      currency: "NGN",
    };

    const resp = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    if (!data.status)
      return res.status(400).json({ success: false, message: data.message, data });

    res.json({ success: true, transfer: data.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// 4️⃣  FINALIZE TRANSFER (if OTP enabled)
// -----------------------------
app.post("/transfer/finalize", async (req, res) => {
  try {
    const { transfer_code, otp } = req.body;
    if (!transfer_code || !otp)
      return res.status(400).json({ success: false, message: "transfer_code and otp required" });

    const resp = await fetch("https://api.paystack.co/transfer/finalize_transfer", {
      method: "POST",
      headers,
      body: JSON.stringify({ transfer_code, otp }),
    });

    const data = await resp.json();
    if (!data.status)
      return res.status(400).json({ success: false, message: data.message, data });

    res.json({ success: true, transfer: data.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// 5️⃣  CHECK BALANCE
// -----------------------------
app.get("/balance", async (req, res) => {
  try {
    const resp = await fetch("https://api.paystack.co/balance", {
      method: "GET",
      headers,
    });
    const data = await resp.json();
    if (!data.status)
      return res.status(400).json({ success: false, message: data.message, data });

    res.json({ success: true, balance: data.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



app.post("/api/payment/initialize", async (req, res) => {
  try {
    const { amount, email, currency = "NGN", mobile_money } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ error: "Amount and email are required" });
    }

    const body = {
      email,
      amount: amount * 100, // Paystack expects amount in kobo
      currency,
       callback_url: "http://localhost:5173/",
      ...(mobile_money ? { mobile_money } : {}),
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Paystack API error");
    }

    res.json({
      status: true,
      message: "Authorization URL created",
      data: data.data,
    });
  } catch (err) {
    console.error("❌ Paystack init error:", err.message);
    res.status(500).json({
      status: false,
      message: "Payment initialization failed",
      error: err.message,
    });
  }
});




app.get("/api/payment/verify/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || data.data.status !== "success") {
      return res.status(400).json({ status: false, message: "Payment not successful", data });
    }

    res.json({ status: true, message: "Payment successful", data: data.data });
  } catch (err) {
    console.error("❌ Paystack verify error:", err.message);
    res.status(500).json({ status: false, message: "Verification failed", error: err.message });
  }
});
