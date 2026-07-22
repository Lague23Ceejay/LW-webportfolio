// GET /api/session — returns whether the current visitor has a valid session.
// admin.js calls this on page load to decide whether to show the login
// screen or the editor.

const { verifySession } = require('../lib/auth');

module.exports = async (req, res) => {
  res.status(200).json({ authenticated: verifySession(req) });
};