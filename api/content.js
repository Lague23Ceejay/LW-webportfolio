// GET  /api/content — anyone can read (it's the same content the public
//                      site displays, nothing sensitive).
// POST /api/content — requires a valid admin session; overwrites the
//                      stored content with the JSON body.
//
// This is the single source of truth for site content (about text,
// footer, quick facts, profile photo URLs, projects, resume). It lives in
// Vercel Blob — the SAME store you already connected for image uploads —
// as one JSON file. That means:
//   - Editing content on the live site updates this file, visible to
//     everyone, on every device, immediately.
//   - Pushing new code from local to GitHub/Vercel never touches this
//     file, so your live content is never affected by a deploy.
//   - Local dev (`vercel dev`) reads/writes the exact same file, since it
//     uses the same BLOB_READ_WRITE_TOKEN — so local and live share one
//     source of content rather than drifting apart.

const { put, head } = require('@vercel/blob');
const { verifySession } = require('../lib/auth');

const CONTENT_PATH = 'data/portfolio-data.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const info = await head(CONTENT_PATH).catch(() => null);
      if (!info) {
        // Nothing saved yet — client falls back to its own built-in defaults.
        res.status(200).json({ data: null });
        return;
      }
      const fileRes = await fetch(info.url);
      const data = await fileRes.json();
      res.status(200).json({ data });
    } catch (err) {
      console.error('Failed to read content:', err);
      res.status(500).json({ error: 'Could not load saved content.' });
    }
    return;
  }

  if (req.method === 'POST') {
    if (!verifySession(req)) {
      res.status(401).json({ error: 'Not logged in. Please log into the admin panel first.' });
      return;
    }
    try {
      const body = req.body; // parsed JSON object — the full portfolio data
      await put(CONTENT_PATH, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Failed to save content:', err);
      res.status(500).json({ error: 'Could not save content.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};