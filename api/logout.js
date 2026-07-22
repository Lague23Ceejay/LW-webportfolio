// POST /api/logout — clears the admin session cookie.

const { makeClearCookie } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Set-Cookie', makeClearCookie(req));
  res.status(200).json({ ok: true });
};