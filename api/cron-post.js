import OAuth from "oauth-1.0a";
import crypto from "crypto";

const oauth = OAuth({
  consumer: { key: process.env.CONSUMER_KEY, secret: process.env.CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function: (base, key) =>
    crypto.createHmac("sha1", key).update(base).digest("base64"),
});

function decodeItem(str) {
  try {
    return JSON.parse(Buffer.from(str, "base64").toString());
  } catch {
    return null;
  }
}

async function rpop() {
  const r = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/rpop/queue:tweets`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    }
  );
  const j = await r.json();
  if (!r.ok || !j.result) return null;
  return decodeItem(j.result);
}

async function lpush(item) {
  const encoded = Buffer.from(JSON.stringify(item)).toString("base64");
  await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/lpush/queue:tweets/${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    }
  );
}

async function postTweet(text) {
  const url = "https://api.twitter.com/2/tweets";
  const token = {
    key: process.env.ACCESS_TOKEN,
    secret: process.env.ACCESS_TOKEN_SECRET,
  };
  const authHeader = oauth.toHeader(
    oauth.authorize({ url, method: "POST" }, token)
  );
  const r = await fetch(url, {
    method: "POST",
    headers: { ...authHeader, "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`tweet_failed_${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  let processed = 0,
    requeued = 0,
    posted = 0;
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const item = await rpop();
    if (!item) break;
    processed++;

    if (item.runAt && new Date(item.runAt).getTime() > now) {
      await lpush(item);
      requeued++;
      break;
    }

    try {
      await postTweet(item.text);
      posted++;
    } catch (e) {
      await lpush(item);
      break;
    }
  }

  return res.json({
    ok: true,
    processed,
    requeued,
    posted,
    time: new Date().toISOString(),
  });
}
