const { handleCors, callAppsScript } = require("../utils");

export default async function handler(req, res) {
    if (handleCors(req, res)) return;

    try {
        if (req.method === "POST") {
            // Add product
            const result = await callAppsScript({ action: "add", ...req.body });
            return res.status(200).json(result);
        }

        if (req.method === "PUT") {
            // Edit product
            const result = await callAppsScript({
                action: "edit",
                id: req.query.id || req.body.id,
                ...req.body,
            });
            return res.status(200).json(result);
        }

        if (req.method === "DELETE") {
            // Delete product
            const result = await callAppsScript({
                action: "delete",
                id: req.query.id || req.body.id,
            });
            return res.status(200).json(result);
        }

        res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
        console.error("Sheets Products Error:", err);
        res.status(500).json({ error: "Operation failed" });
    }
}
