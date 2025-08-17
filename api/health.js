export default function handler(req, res) {
  const keys = ['CONSUMER_KEY','CONSUMER_SECRET','ACCESS_TOKEN','ACCESS_TOKEN_SECRET'];
  res.setHeader('Access-Control-Allow-Origin','*');
  res.json(Object.fromEntries(keys.map(k => [k, !!process.env[k]])));
}
