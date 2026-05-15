const paystack = require("paystack-api");
const { handleCors, PAYSTACK_SECRET_KEY } = require("../utils");

const paystackClient = paystack(PAYSTACK_SECRET_KEY);

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    try {
        if (req.method === "POST") {
            const { email, amount, productName, productImage, name, phone, address } = req.body;

            const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
            const host = process.env.VERCEL_URL || process.env.BASE_URL || "localhost:3000";
            const callbackUrl = `${protocol}://${host}/api/verify`;

            const response = await paystackClient.transaction.initialize({
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

            return res.status(200).json(response.data);
        }

        res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
        console.error("Payment Error:", err);
        res.status(500).json({ error: "Payment failed to start" });
    }
}
