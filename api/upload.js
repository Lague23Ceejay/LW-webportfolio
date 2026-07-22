// POST /api/upload?filename=my-image.png
// Body: raw file bytes (sent via fetch(url, { method:'POST', body: file }) from admin.js)
// Requires the BLOB_READ_WRITE_TOKEN environment variable, which Vercel sets
// automatically once you attach a Blob store to this project.
// Also requires a valid admin session cookie — set by /api/login — so this
// can't be used by anyone who just happens to find the URL.

const { put } = require('@vercel/blob');
const { verifySession } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!verifySession(req)) {
    res.status(401).json({ error: 'Not logged in. Please log into the admin panel first.' });
    return;
  }

  const filename = (req.query.filename || `upload-${Date.now()}`).toString();

  // basic guardrails: keep this endpoint limited to images
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const allowedExt = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
  if (!allowedExt.test(safeName)) {
    res.status(400).json({ error: 'Only image files are allowed (png, jpg, gif, webp, svg, avif).' });
    return;
  }

  try {
    const blob = await put(`projects/${Date.now()}-${safeName}`, req, {
      access: 'public',
      addRandomSuffix: true,
    });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Blob upload failed:', err);
    res.status(500).json({ error: 'Upload failed. Check that BLOB_READ_WRITE_TOKEN is configured.' });
  }
};