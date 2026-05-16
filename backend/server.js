const path = require("path");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

const PUBLIC_DIR = path.join(__dirname, "../public");
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "";
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "bag-website";
const MONGODB_DIRECT_HOSTS = process.env.MONGODB_DIRECT_HOSTS || "";
const MONGODB_REPLICA_SET = process.env.MONGODB_REPLICA_SET || "";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const MAIL_SERVICE = process.env.MAIL_SERVICE || "gmail";
const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";

const missingEnv = [];
if (!MONGODB_URI) missingEnv.push("MONGODB_URI");
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

function buildMongoUri() {
  if (!MONGODB_DIRECT_HOSTS || !MONGODB_URI.startsWith("mongodb+srv://")) {
    return MONGODB_URI;
  }

  const srvUrl = new URL(MONGODB_URI);
  const params = new URLSearchParams(srvUrl.search);
  params.set("tls", "true");
  params.set("authSource", params.get("authSource") || "admin");
  if (MONGODB_REPLICA_SET) {
    params.set("replicaSet", MONGODB_REPLICA_SET);
  }

  const credentials = srvUrl.username
    ? `${srvUrl.username}${srvUrl.password ? `:${srvUrl.password}` : ""}@`
    : "";
  const dbPath = srvUrl.pathname && srvUrl.pathname !== "/" ? srvUrl.pathname : `/${MONGODB_DB_NAME}`;

  return `mongodb://${credentials}${MONGODB_DIRECT_HOSTS}${dbPath}?${params.toString()}`;
}

const mongoClient = new MongoClient(buildMongoUri());
let db;
let productsCollection;
let ordersCollection;

async function connectToMongo() {
  await mongoClient.connect();
  db = mongoClient.db(MONGODB_DB_NAME);
  productsCollection = db.collection("products");
  ordersCollection = db.collection("orders");
  console.log(`Connected to MongoDB database "${MONGODB_DB_NAME}"`);
}

function normalizeOrigin(origin) {
  if (!origin) return "";
  return /^https?:\/\//i.test(origin) ? origin : `https://${origin}`;
}

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(FRONTEND_URL ? [normalizeOrigin(FRONTEND_URL)] : []),
]);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return cb(null, true);
      }
    } catch {
      // Fall through to the explicit origin check below.
    }
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
      sameSite: process.env.NODE_ENV === "production" && FRONTEND_URL ? "none" : "lax",
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

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use(express.static(PUBLIC_DIR));

// ===============================
// PRODUCTS API (GET & ADD)
// ===============================

function normalizeImages(images) {
  if (Array.isArray(images)) return images.filter(Boolean);
  if (typeof images === "string") return images.split("|").map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeColors(colors) {
  if (Array.isArray(colors)) return colors.filter(Boolean);
  if (typeof colors === "string") return colors.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function buildProductDocument(body) {
  return {
    id: body.id ? String(body.id) : new ObjectId().toString(),
    name: body.name || "",
    price: Number(body.price) || 0,
    category: body.category || "",
    gender: body.gender || "",
    badge: body.badge || "",
    colors: normalizeColors(body.colors),
    images: normalizeImages(body.images),
    description: body.description || "",
    rowIndex: body.rowIndex !== undefined && body.rowIndex !== null ? Number(body.rowIndex) : undefined,
    updatedAt: new Date(),
  };
}

// 1. GET ALL DATA - This serves both the Shop (Products) and Admin (Products + Orders)
app.get("/api/products", async (req, res) => {
  try {
    const products = await productsCollection.find({}).sort({ name: 1 }).toArray();
    const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.json({ products, orders });
  } catch (err) {
    console.error("Mongo Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// 2. ADMIN ACTIONS - ADD, EDIT, DELETE PRODUCTS AND ORDERS
app.post("/api/products", async (req, res) => {
  try {
    console.log("Admin Product Action:", req.body && req.body.action, req.body && req.body.id);
    const action = String(req.body.action || "add").toLowerCase();

    if (action === "add") {
      const productDoc = buildProductDocument(req.body);
      productDoc.createdAt = new Date();
      await productsCollection.insertOne(productDoc);
      return res.json({ ok: true, product: productDoc });
    }

    const filter = req.body.id
      ? { id: String(req.body.id) }
      : req.body.rowIndex !== undefined && req.body.rowIndex !== null
        ? { rowIndex: Number(req.body.rowIndex) }
        : null;

    if (action === "edit") {
      if (!filter) {
        return res.status(400).json({ error: "Missing product id or rowIndex" });
      }
      const productDoc = buildProductDocument(req.body);
      const result = await productsCollection.updateOne(filter, { $set: productDoc });
      if (!result.matchedCount) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.json({ ok: true, product: productDoc });
    }

    if (action === "delete") {
      if (!filter) {
        return res.status(400).json({ error: "Missing product id or rowIndex" });
      }
      const result = await productsCollection.deleteOne(filter);
      if (!result.deletedCount) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.json({ ok: true });
    }

    if (action === "update_order_status") {
      const result = await ordersCollection.updateOne(
        { ref: String(req.body.ref) },
        { $set: { status: req.body.status || "pending", updatedAt: new Date() } }
      );
      if (!result.matchedCount) {
        return res.status(404).json({ error: "Order not found" });
      }
      return res.json({ ok: true });
    }

    if (action === "delete_order") {
      const result = await ordersCollection.deleteOne({ ref: String(req.body.ref) });
      if (!result.deletedCount) {
        return res.status(404).json({ error: "Order not found" });
      }
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("Admin POST Error:", err);
    res.status(500).json({ error: "Operation failed" });
  }
});

// NEWSLETTER (MATCH FRONTEND CALL)
// ===============================
app.post("/api/subscribe", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    const result = await db.collection("subscribers").updateOne(
      { email: String(email).toLowerCase().trim() },
      { $set: { email: String(email).toLowerCase().trim(), createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Subscribe Error:", err);
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
    const baseUrl = BASE_URL.replace(/\/$/, "");
    const callbackUrl = baseUrl
      ? `${baseUrl}${baseUrl.endsWith("/api/verify") ? "" : "/api/verify"}`
      : `${req.protocol}://${req.get("host")}/api/verify`;

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

      const orderDoc = {
        ref,
        email: customerEmail,
        name: meta.customer_name,
        phone: meta.customer_phone,
        address: meta.delivery_address,
        amount: pAmount,
        product: meta.product_name,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await ordersCollection.updateOne(
          { ref: orderDoc.ref },
          { $setOnInsert: orderDoc, $set: { updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (mongoErr) {
        console.error("Mongo order save failed:", mongoErr);
      }

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
                ${productImage
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
              ${productImage
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

async function startServer() {
  try {
    await connectToMongo();
    app.listen(PORT, "0.0.0.0", () => console.log(`Backend running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
