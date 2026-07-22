// Shared helper for signing/verifying the admin session cookie.
// Used by login.js, logout.js, session.js, and upload.js.

const crypto = require('crypto');

// Set a real SESSION_SECRET env var in Vercel (any long random string).
// Falls back to a dev-only value so things still work locally.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me-in-vercel-env-vars';
const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hour session

function sign(expiry) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(String(expiry)).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  });
  return cookies;
}

function makeSessionCookie(req) {
  const expiry = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = `${expiry}.${sign(expiry)}`;
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Strict${isHttps ? '; Secure' : ''}`;
}

function makeClearCookie(req) {
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${isHttps ? '; Secure' : ''}`;
}

function verifySession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const [expiryStr, sig] = token.split('.');
  if (!expiryStr || !sig) return false;
  const expiry = Number(expiryStr);
  if (!expiry || Date.now() > expiry) return false;
  const expected = sign(expiry);
  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

module.exports = { verifySession, makeSessionCookie, makeClearCookie };