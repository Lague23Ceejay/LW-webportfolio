// POST /api/upload
// This is now a *token* endpoint, not a file-upload endpoint. The browser
// uploads the actual file bytes directly to Vercel Blob (not through this
// function), which avoids Vercel's ~4.5MB serverless request-body limit.
// This function's only job is to check the admin session is valid and then
// hand out a short-lived, scoped upload token via @vercel/blob's
// handleUpload() helper. See admin.js for the client side of this flow.
//
// Requires the BLOB_READ_WRITE_TOKEN environment variable, which Vercel
// sets automatically once you attach a Blob store to this project.

const { handleUpload } = require('@vercel/blob/client');
const { verifySession } = require('../lib/auth');

const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

const RESUME_TYPES = [...IMAGE_TYPES, 'application/pdf'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!verifySession(req)) {
          throw new Error('Not logged in. Please log into the admin panel first.');
        }
        let kind = 'image';
        try {
          kind = JSON.parse(clientPayload || '{}').kind || 'image';
        } catch {
          // ignore malformed payload, fall back to 'image'
        }
        const isResume = kind === 'resume';
        return {
          allowedContentTypes: isResume ? RESUME_TYPES : IMAGE_TYPES,
          addRandomSuffix: true,
          maximumSizeInBytes: isResume ? 10 * 1024 * 1024 : 20 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // Nothing to persist server-side — the resulting URL is saved via
        // /api/content by admin.js once the upload finishes.
      },
    });
    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Blob token generation failed:', err);
    res.status(400).json({ error: err.message || 'Upload failed.' });
  }
};