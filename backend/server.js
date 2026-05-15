const path = require("path");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

const PUBLIC_DIR = path.join(__dirname, "../public");
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "";
const GOOGLE_WEB_APP_URL = process.env.GOOGLE_WEB_APP_URL || "";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const MAIL_SERVICE = process.env.MAIL_SERVICE || "gmail";
const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";

const missingEnv = [];
if (!GOOGLE_WEB_APP_URL) missingEnv.push("GOOGLE_WEB_APP_URL");
if (!PAYSTACK_SECRET_KEY) missingEnv.push("PAYSTACK_SECRET_KEY");
if (!SESSION_SECRET) missingEnv.push("SESSION_SECRET");
if (!MAIL_USER) missingEnv.push("MAIL_USER");
if (!MAIL_PASS) missingEnv.push("MAIL_PASS");
if (!ADMIN_USER) missingEnv.push("ADMIN_USER");
if (!ADMIN_PASS_HASH && !ADMIN_PASS) {
  missingEnv.push("ADMIN_PASS or ADMIN_PASS_HASH");
}
if (missingEnv.length) {
  console.error("Missing required environment variables:", missingEnv.join(", "));
  process.exit(1);
}

const paystack = require("paystack-api")(PAYSTACK_SECRET_KEY);

const allowedOrigins = new Set([
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(FRONTEND_URL ? [FRONTEND_URL] : []),
]);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.set("trust proxy", 1);

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const transporter = nodemailer.createTransport({
  service: MAIL_SERVICE,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

const EFFECTIVE_ADMIN_HASH =
  ADMIN_PASS_HASH || bcrypt.hashSync(ADMIN_PASS, 10);

app.use(
  session({
    name: "hotshionhub.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect("/admin-login.html");
}

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/inventory.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "inventory.html"));
});

app.get("/orders.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "orders.html"));
});

app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin-login.html"));
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }
    const userOk = username === ADMIN_USER;
    const passOk = await bcrypt.compare(password, EFFECTIVE_ADMIN_HASH);
    if (!userOk || !passOk) {
      return res.status(401).json({ error: "Invalid login" });
    }
    req.session.admin = true;
    req.session.adminUser = username;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("hotshionhub.sid");
    res.json({ ok: true });
  });
});

app.get("/api/me", (req, res) => {
  res.json({ admin: !!(req.session && req.session.admin) });
});

app.use(express.static(PUBLIC_DIR));

async function callAppsScript(payload) {
  if (!GOOGLE_WEB_APP_URL) {
    throw new Error("GOOGLE_WEB_APP_URL is not set.");
  }
  const response = await fetchFn(GOOGLE_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  return response.json();
}

// ===============================
// PRODUCTS API (GET & ADD)
// ===============================

// 1. GET ALL DATA - This serves both the Shop (Products) and Admin (Products + Orders)
app.get("/api/products", async (req, res) => {
  try {
    const response = await fetchFn(GOOGLE_WEB_APP_URL, { redirect: "follow" });
    const data = await response.json();

    // We send the FULL data object { products, orders }
    // The frontend scripts are already smart enough to pick what they need.
    res.json(data);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// 2. ADD PRODUCT - This was missing! This allows your Admin page to save data.
// This handles ADD, DELETE, and UPDATE actions from the Admin Panel
app.post("/api/products", async (req, res) => {
  try {
    console.log("Admin Product Action:", req.body && req.body.action, req.body && req.body.id);
    const result = await callAppsScript(req.body); // Send the whole body (it contains the action)
    console.log("Admin Product Result:", result);
    res.json(result);
  } catch (err) {
    console.error("Admin POST Error:", err);
    res.status(500).json({ error: "Operation failed" });
  }
});

// ===============================
// OPTIONAL: EXPLICIT SHEETS ROUTES
// ===============================

app.get("/api/sheets/all", async (req, res) => {
  try {
    const response = await fetchFn(GOOGLE_WEB_APP_URL, { redirect: "follow" });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.post("/api/sheets/orders", async (req, res) => {
  try {
    const result = await callAppsScript({
      action: "record_order",
      ...req.body,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

app.patch("/api/sheets/orders/status", async (req, res) => {
  try {
    const result = await callAppsScript({
      action: "update_order_status",
      ref: req.body.ref,
      status: req.body.status,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

app.delete("/api/sheets/orders/:ref", async (req, res) => {
  try {
    const result = await callAppsScript({
      action: "delete_order",
      ref: req.params.ref,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

app.post("/api/sheets/products", async (req, res) => {
  try {
    const result = await callAppsScript({ action: "add", ...req.body });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

app.put("/api/sheets/products/:id", async (req, res) => {
  try {
    const result = await callAppsScript({
      action: "edit",
      id: req.params.id,
      ...req.body,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

app.delete("/api/sheets/products/:id", async (req, res) => {
  try {
    const result = await callAppsScript({
      action: "delete",
      id: req.params.id,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

// ===============================
// NEWSLETTER (MATCH FRONTEND CALL)
// ===============================
app.post("/api/subscribe", async (req, res) => {
  try {
    const result = await callAppsScript({ action: "subscribe", ...req.body });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Subscription failed" });
  }
});

// ===============================
// PAYMENT & VERIFICATION
// ===============================

// 1. Start Payment
app.post("/api/pay", async (req, res) => {
  try {
    const { email, amount, productName, productImage, name, phone, address } = req.body;
    const callbackUrl =
      BASE_URL ||
      `${req.protocol}://${req.get("host")}/api/verify`;

    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100, // Naira to Kobo
      metadata: {
        product_name: productName,
        product_image: productImage || "",
        customer_name: name,
        customer_phone: phone,
        delivery_address: address,
      },
      callback_url: callbackUrl,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Payment failed to start" });
  }
});

// 2. Verify Payment
app.get("/api/verify", async (req, res) => {
  const ref = req.query.reference;
  if (!ref) {
    return res.status(400).send("Missing payment reference");
  }
  try {
    const response = await fetchFn(
      `https://api.paystack.co/transaction/verify/${ref}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );
    const result = await response.json();

    if (result.data && result.data.status === "success") {
      const meta = result.data.metadata;
      const pAmount = result.data.amount / 100;
      const customerEmail = result.data.customer.email;

      // Log to Google Sheets
      await fetchFn(GOOGLE_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_order",
          email: customerEmail,
          name: meta.customer_name,
          phone: meta.customer_phone,
          address: meta.delivery_address,
          amount: pAmount,
          product: meta.product_name,
          ref: ref,
        }),
        redirect: "follow",
      });

      const orderDate = new Date().toLocaleString();
      const subject = `New Order Received • ${meta.product_name}`;
      const productImage = meta.product_image || "";
      const textBody = [
        `NEW ORDER`,
        `Date: ${orderDate}`,
        `Product: ${meta.product_name}`,
        `Amount: ₦${pAmount}`,
        `Customer: ${meta.customer_name} (${customerEmail})`,
        `Phone: ${meta.customer_phone}`,
        `Address: ${meta.delivery_address}`,
        `Reference: ${ref}`,
      ].join("\n");

      const htmlBody = `
        <div style="font-family:Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
          <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e6e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:#111827; color:#ffffff; padding:20px 24px;">
              <div style="font-size:14px; letter-spacing:1px; text-transform:uppercase; opacity:.7;">Order Alert</div>
              <div style="font-size:22px; font-weight:700; margin-top:6px;">New Order Received</div>
            </div>
            <div style="padding:24px;">
              <div style="margin-bottom:16px;">
                <div style="font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px;">Order Summary</div>
                <div style="font-size:18px; font-weight:700; color:#111827; margin-top:6px;">${meta.product_name}</div>
                ${
                  productImage
                    ? `<img src="${productImage}" alt="Product" style="margin-top:10px; width:100%; max-width:220px; border-radius:8px; border:1px solid #e5e7eb;" />`
                    : ""
                }
              </div>

              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Amount</td>
                  <td style="padding:8px 0; text-align:right; font-weight:700; color:#111827;">₦${pAmount}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Customer</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${meta.customer_name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Email</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Phone</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${meta.customer_phone}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Address</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${meta.delivery_address}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Reference</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${ref}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Date</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${orderDate}</td>
                </tr>
              </table>

              <div style="margin-top:20px; padding:14px 16px; background:#f3f4f6; border-radius:8px; color:#374151; font-size:13px;">
                This order has already been recorded in your Google Sheet.
              </div>
            </div>
            <div style="padding:16px 24px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">
              Hotshion Hub • Automated Order Notification
            </div>
          </div>
        </div>
      `;

      const mailFrom = MAIL_USER;
      const adminTo = process.env.MAIL_TO || MAIL_USER;
      const buyerTo = customerEmail;

      await transporter.sendMail({
        from: mailFrom,
        to: adminTo,
        subject,
        text: textBody,
        html: htmlBody,
      });

      const buyerSubject = `Order Confirmation • ${meta.product_name}`;
      const buyerText = [
        `Hi ${meta.customer_name},`,
        ``,
        `Thanks for your order!`,
        `Product: ${meta.product_name}`,
        `Amount: ₦${pAmount}`,
        `Reference: ${ref}`,
        `Delivery Address: ${meta.delivery_address}`,
        ``,
        `We will contact you if we need anything else.`,
        `— Hotshion Hub`,
      ].join("\n");

      const buyerHtml = `
        <div style="font-family:Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
          <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e6e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:#111827; color:#ffffff; padding:20px 24px;">
              <div style="font-size:14px; letter-spacing:1px; text-transform:uppercase; opacity:.7;">Order Confirmation</div>
              <div style="font-size:22px; font-weight:700; margin-top:6px;">Thank you for your purchase</div>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px; color:#111827;">Hi ${meta.customer_name},</p>
              <p style="margin:0 0 18px; color:#374151;">We’ve received your order and are getting it ready.</p>
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Product</td>
                  <td style="padding:8px 0; text-align:right; color:#111827; font-weight:700;">${meta.product_name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Amount</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">₦${pAmount}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Reference</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${ref}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Delivery Address</td>
                  <td style="padding:8px 0; text-align:right; color:#111827;">${meta.delivery_address}</td>
                </tr>
              </table>
              ${
                productImage
                  ? `<div style="margin-top:14px;">
                      <img src="${productImage}" alt="Product" style="width:100%; max-width:260px; border-radius:8px; border:1px solid #e5e7eb;" />
                    </div>`
                  : ""
              }
              <div style="margin-top:20px; padding:14px 16px; background:#f3f4f6; border-radius:8px; color:#374151; font-size:13px;">
                If you have questions, reply to this email.
              </div>
            </div>
            <div style="padding:16px 24px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">
              Hotshion Hub • Order Confirmation
            </div>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: mailFrom,
        to: buyerTo,
        subject: buyerSubject,
        text: buyerText,
        html: buyerHtml,
      });

      const returnHref = FRONTEND_URL ? `${FRONTEND_URL}/index.html` : "/index.html";
      res.send(`
        <div style="text-align:center; padding:50px; font-family:sans-serif;">
            <h1 style="color:green;">Payment Successful!</h1>
            <p>Thank you, ${meta.customer_name}. We have received your payment for ${meta.product_name}.</p>
            <p>Your order will be shipped to: ${meta.delivery_address}</p>
            <a href="${returnHref}" style="text-decoration:none; background:black; color:white; padding:10px 20px; border-radius:5px;">Return to Shop</a>
        </div>
      `);
    } else {
      res.status(400).send("Payment not completed");
    }
  } catch (err) {
    res.status(500).send("Verification Error");
  }
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
