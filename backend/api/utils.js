const bcrypt = require("bcryptjs");
require("dotenv").config();

// Environment variables
const GOOGLE_WEB_APP_URL = process.env.GOOGLE_WEB_APP_URL || "";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const MAIL_SERVICE = process.env.MAIL_SERVICE || "gmail";
const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "";

const EFFECTIVE_ADMIN_HASH = ADMIN_PASS_HASH || bcrypt.hashSync(ADMIN_PASS, 10);

// Fetch function
const fetchFn =
    typeof fetch === "function"
        ? fetch
        : (...args) =>
            import("node-fetch").then(({ default: fetch }) => fetch(...args));

// CORS Headers
function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );
}

function handleCors(req, res) {
    if (req.method === "OPTIONS") {
        setCorsHeaders(res);
        res.status(200).end();
        return true;
    }
    setCorsHeaders(res);
    return false;
}

// Call Google Apps Script
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

// Get from Google Sheets
async function getFromGoogleSheets() {
    if (!GOOGLE_WEB_APP_URL) {
        throw new Error("GOOGLE_WEB_APP_URL is not set.");
    }
    const response = await fetchFn(GOOGLE_WEB_APP_URL, { redirect: "follow" });
    return response.json();
}

module.exports = {
    GOOGLE_WEB_APP_URL,
    PAYSTACK_SECRET_KEY,
    ADMIN_USER,
    ADMIN_PASS,
    ADMIN_PASS_HASH,
    SESSION_SECRET,
    MAIL_SERVICE,
    MAIL_USER,
    MAIL_PASS,
    FRONTEND_URL,
    EFFECTIVE_ADMIN_HASH,
    fetchFn,
    setCorsHeaders,
    handleCors,
    callAppsScript,
    getFromGoogleSheets,
};
