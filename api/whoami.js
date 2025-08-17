import OAuth from "oauth-1.0a";
import crypto from "crypto";

const oauth = OAuth({
  consumer: { key: process.env.CONSUMER_KEY, secret: process.env.CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function: (base, key) => crypto.createHmac("sha1", key).update(base).digest("base64"),
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  const url = "https://api.twitter.com/1.1/account/verify_credentials.json";
  const token = { key: process.env.ACCESS_TOKEN, secret: process.env.ACCESS_TOKEN_SECRET };
  const auth = oauth.toHeader(oauth.authorize({ url, method: "GET" }, token));
  const r = await fetch(url, { headers: { ...auth } });
  const body = await r.text();
  res.status(r.status).send(body); // 200 means tokens are valid & match the app
}
