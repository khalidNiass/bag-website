const { handleCors, callAppsScript, getFromGoogleSheets } = require("./utils");

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "GET") {
      // Get all products
      const data = await getFromGoogleSheets();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // Add/Edit/Delete product
      const result = await callAppsScript(req.body);
      return res.status(200).json(result);
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Products API Error:", err);
    res.status(500).json({ error: err.message || "Failed to process request" });
  }
}
