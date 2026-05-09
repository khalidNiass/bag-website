const { handleCors, getFromGoogleSheets } = require("../utils");

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "GET") {
      const data = await getFromGoogleSheets();
      return res.status(200).json(data);
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Sheets All Error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
