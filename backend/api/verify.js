const nodemailer = require("nodemailer");
const { handleCors, fetchFn, PAYSTACK_SECRET_KEY, MAIL_USER, MAIL_PASS, MAIL_SERVICE, FRONTEND_URL, callAppsScript } = require("./utils");

const transporter = nodemailer.createTransport({
    service: MAIL_SERVICE,
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
    },
});

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    try {
        const ref = req.query.reference;
        if (!ref) {
            return res.status(400).send("Missing payment reference");
        }

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
            await callAppsScript({
                action: "record_order",
                email: customerEmail,
                name: meta.customer_name,
                phone: meta.customer_phone,
                address: meta.delivery_address,
                amount: pAmount,
                product: meta.product_name,
                ref: ref,
            });

            const orderDate = new Date().toLocaleString();
            const subject = `New Order Received • ${meta.product_name}`;
            const productImage = meta.product_image || "";
            const adminTo = process.env.MAIL_TO || MAIL_USER;
            const buyerTo = customerEmail;

            // Admin email
            const adminHtml = `
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
                ${productImage ? `<img src="${productImage}" alt="Product" style="margin-top:10px; width:100%; max-width:220px; border-radius:8px; border:1px solid #e5e7eb;" />` : ""}
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr><td style="padding:8px 0; color:#6b7280;">Amount</td><td style="padding:8px 0; text-align:right; font-weight:700; color:#111827;">₦${pAmount}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Customer</td><td style="padding:8px 0; text-align:right; color:#111827;">${meta.customer_name}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Email</td><td style="padding:8px 0; text-align:right; color:#111827;">${customerEmail}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Phone</td><td style="padding:8px 0; text-align:right; color:#111827;">${meta.customer_phone}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Address</td><td style="padding:8px 0; text-align:right; color:#111827;">${meta.delivery_address}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Reference</td><td style="padding:8px 0; text-align:right; color:#111827;">${ref}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Date</td><td style="padding:8px 0; text-align:right; color:#111827;">${orderDate}</td></tr>
              </table>
              <div style="margin-top:20px; padding:14px 16px; background:#f3f4f6; border-radius:8px; color:#374151; font-size:13px;">This order has been recorded in your Google Sheet.</div>
            </div>
            <div style="padding:16px 24px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">Hotshion Hub • Automated Order Notification</div>
          </div>
        </div>
      `;

            await transporter.sendMail({
                from: MAIL_USER,
                to: adminTo,
                subject,
                html: adminHtml,
            });

            // Buyer email
            const buyerHtml = `
        <div style="font-family:Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
          <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e6e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:#111827; color:#ffffff; padding:20px 24px;">
              <div style="font-size:14px; letter-spacing:1px; text-transform:uppercase; opacity:.7;">Order Confirmation</div>
              <div style="font-size:22px; font-weight:700; margin-top:6px;">Thank you for your purchase</div>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px; color:#111827;">Hi ${meta.customer_name},</p>
              <p style="margin:0 0 18px; color:#374151;">We've received your order and are getting it ready.</p>
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr><td style="padding:8px 0; color:#6b7280;">Product</td><td style="padding:8px 0; text-align:right; color:#111827; font-weight:700;">${meta.product_name}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Amount</td><td style="padding:8px 0; text-align:right; color:#111827;">₦${pAmount}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Reference</td><td style="padding:8px 0; text-align:right; color:#111827;">${ref}</td></tr>
                <tr><td style="padding:8px 0; color:#6b7280;">Delivery Address</td><td style="padding:8px 0; text-align:right; color:#111827;">${meta.delivery_address}</td></tr>
              </table>
              ${productImage ? `<div style="margin-top:14px;"><img src="${productImage}" alt="Product" style="width:100%; max-width:260px; border-radius:8px; border:1px solid #e5e7eb;" /></div>` : ""}
              <div style="margin-top:20px; padding:14px 16px; background:#f3f4f6; border-radius:8px; color:#374151; font-size:13px;">If you have questions, reply to this email.</div>
            </div>
            <div style="padding:16px 24px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">Hotshion Hub • Order Confirmation</div>
          </div>
        </div>
      `;

            await transporter.sendMail({
                from: MAIL_USER,
                to: buyerTo,
                subject: `Order Confirmation • ${meta.product_name}`,
                html: buyerHtml,
            });

            const returnHref = FRONTEND_URL ? `${FRONTEND_URL}/index.html` : "/index.html";
            return res.send(`
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
        console.error("Verify Error:", err);
        res.status(500).send("Verification Error");
    }
}
