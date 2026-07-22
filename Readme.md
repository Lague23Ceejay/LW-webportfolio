# Portfolio site

Static HTML/CSS/JS portfolio with a PIN-gated admin panel and a console for
editing content. Images upload to Vercel Blob through a small serverless
function.

## Files

```
index.html       Public portfolio (Home, About, Projects, Contact, Footer)
admin.html       Admin panel UI
styles.css       Shared styles + light/dark theme tokens
script.js        Theme toggle, profile-photo swap, renders content from localStorage
admin.js         Login flow, form editors, console commands, image upload
api/login.js     Checks the PIN server-side and sets a signed session cookie
api/logout.js    Clears the session cookie
api/session.js   Tells the admin page whether the visitor is logged in
api/upload.js    Uploads to Vercel Blob — requires a valid session
api/_auth.js     Shared helper for signing/checking the session cookie
package.json     Dependency (@vercel/blob) for the API routes
vercel.json      Minimal Vercel config
```

## Running locally

```bash
npm install
npx vercel dev
```

`vercel dev` runs both the static files and the `/api/upload` function
together. Opening `index.html` directly in a browser (without `vercel dev`)
will work for everything except image uploads, since that needs the
serverless function.

## Deploying

1. Push this folder to a GitHub repo and import it in Vercel, or run
   `vercel` from inside the folder.
2. In the Vercel dashboard: **Storage → Create Database → Blob**, then
   connect it to this project. Vercel will automatically set the
   `BLOB_READ_WRITE_TOKEN` environment variable — you don't need to create
   it by hand.
3. In **Settings → Environment Variables**, add:
   - `ADMIN_PIN` — the 4-digit PIN you actually want to use (defaults to
     `1234` if you don't set this, so set it before sharing the URL).
   - `SESSION_SECRET` — any long random string (e.g. run
     `openssl rand -hex 32` and paste the result). This signs the login
     session, so it should be different from your PIN and kept private.
4. Redeploy so the functions pick up the new environment variables.

## Admin panel

- Go to `/admin.html`.
- Enter your PIN (set via the `ADMIN_PIN` environment variable — see above).
- Everything is arranged into plain-language panels: **Profile photos**,
  **About you**, **Quick details**, **Projects**, **Footer text**. Fill in
  a field and press its Save button — you'll see a small "Saved ✓" confirm
  it went through, and the change is live on your site immediately.
- **Profile photos**: upload a main photo, and optionally a second one. If
  you add both, your site fades between them every 2 seconds. If you only
  add one, it just shows that one. If you don't add any, it shows a simple
  placeholder with your initials.
- Content (about text, quick facts, footer, projects, profile photo URLs)
  is saved to `localStorage` in your own browser under the key
  `portfolioData`. That means edits you make in the admin panel only appear
  on the public page in that same browser — there's no shared database
  backing the text content. The uploaded *images* are the exception: those
  live in Vercel Blob, so they're genuinely shared/public once uploaded.
- There's also an **Advanced: command console** section at the bottom,
  collapsed by default. It's entirely optional — a typing shortcut for
  people who prefer it — and does the exact same things as the forms above:
  `update about <text>`, `update footer <text>`,
  `add project <name> | <description> | <tags> | <link>`,
  `remove project <name or id>`, `list projects`, `theme light` / `theme dark`,
  `clear`.

## Security

Login now works server-side:

- `/api/login` checks your PIN against the `ADMIN_PIN` environment
  variable (never shipped to the browser) and, if correct, sets an
  `HttpOnly` session cookie signed with `SESSION_SECRET`. JavaScript in the
  browser can't read or forge that cookie.
- `/api/session` is how the admin page checks, on load, whether you're
  still logged in.
- `/api/logout` clears the cookie.
- `/api/upload` checks for a valid session before accepting a file, so the
  upload endpoint isn't open to anyone who happens to find the URL.

What this setup still doesn't give you: brute-force throttling beyond a
small delay on wrong attempts, and multi-user accounts (there's just one
shared PIN). For a personal portfolio that's normally plenty. If you want
to go further — rate limiting, multiple admin users, an audit log of
edits — happy to help add that too.