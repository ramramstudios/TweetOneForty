import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-queue-token");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  if (req.headers["x-queue-token"] !== process.env.QUEUE_ADMIN_TOKEN)
    return res.status(401).json({ error: "unauthorized" });

  const { text, runAt } = req.body || {};
  if (!text || text.length > 280)
    return res.status(400).json({ error: "invalid text" });

  const item = {
    id: crypto.randomUUID(),
    text,
    runAt: runAt ? new Date(runAt).toISOString() : null,
  };

  const encoded = Buffer.from(JSON.stringify(item)).toString("base64");
  const r = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/lpush/queue:tweets/${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    }
  );
  if (!r.ok) return res.status(500).json({ error: "queue_push_failed" });

  return res.json({ ok: true, enqueued: item });
}
