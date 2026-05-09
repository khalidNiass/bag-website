const { handleCors, callAppsScript } = require("../utils");

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "POST") {
      // Record order
      const result = await callAppsScript({
        action: "record_order",
        ...req.body,
      });
      return res.status(200).json(result);
    }

    if (req.method === "PATCH") {
      // Update order status
      const result = await callAppsScript({
        action: "update_order_status",
        ref: req.body.ref,
        status: req.body.status,
      });
      return res.status(200).json(result);
    }

    if (req.method === "DELETE") {
      // Delete order
      const ref = req.query.ref || req.body.ref;
      const result = await callAppsScript({
        action: "delete_order",
        ref,
      });
      return res.status(200).json(result);
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Orders API Error:", err);
    res.status(500).json({ error: "Operation failed" });
  }
}
