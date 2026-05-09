const { handleCors, callAppsScript } = require("../utils");

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "POST") {
      const result = await callAppsScript({ action: "subscribe", ...req.body });
      return res.status(200).json(result);
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Subscribe Error:", err);
    res.status(500).json({ error: "Subscription failed" });
  }
}
