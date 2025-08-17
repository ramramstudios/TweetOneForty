import OAuth from "oauth-1.0a";
import crypto from "crypto";

const oauth = OAuth({
  consumer: { key: process.env.CONSUMER_KEY, secret: process.env.CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function: (base, key) => crypto.createHmac("sha1", key).update(base).digest("base64"),
});

export default async function handler(req, res) {
  // ✅ CORS: allow only your W3Spaces origin in production
  const ORIGIN = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { text } = req.body || {};
    if (!text || text.length > 280) return res.status(400).json({ error: "Invalid text" });

    const url = "https://api.twitter.com/2/tweets";
    const token = { key: process.env.ACCESS_TOKEN, secret: process.env.ACCESS_TOKEN_SECRET };
    const authHeader = oauth.toHeader(oauth.authorize({ url, method: "POST" }, token));

    const r = await fetch(url, {
      method: "POST",
      headers: { ...authHeader, "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
