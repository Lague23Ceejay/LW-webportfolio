// POST /api/login  body: { "pin": "1234" }
// Checks the PIN against the ADMIN_PIN environment variable (server-side,
// never shipped to the browser) and sets a signed, httpOnly session cookie.

const { makeSessionCookie } = require('./_auth');

// Set a real ADMIN_PIN env var in Vercel before deploying publicly.
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let pin;
  try {
    pin = JSON.parse(body || '{}').pin;
  } catch {
    res.status(400).json({ error: 'Bad request' });
    return;
  }

  if (typeof pin !== 'string' || pin !== ADMIN_PIN) {
    // small delay to make PIN-guessing scripts slower/less practical
    await new Promise((r) => setTimeout(r, 400));
    res.status(401).json({ error: 'Incorrect PIN' });
    return;
  }

  res.setHeader('Set-Cookie', makeSessionCookie(req));
  res.status(200).json({ ok: true });
};