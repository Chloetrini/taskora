# Taskora

A to-do list with accounts, notes, subtasks, tags, filters and a profile, built with Next.js 16, MongoDB and TypeScript. HNG 15, Week 1.

## Features
- **Multi-tenant**: every user has their own account and fully isolated data in a shared database
- Sign up and log in with email/username or **Google**, with confirm password and a live "username available" check
- Dashboard: today's date as the headline, progress, stats, overdue, due today and up next
- Tasks with notes, priority, category, tags, due date, subtasks and pinning
- Tasks shown as cards with Edit and Delete buttons (Delete asks to confirm)
- Email verification before login, forgot and reset password (Brevo); passwords need a special character
- Trash: deleted tasks can be restored or deleted forever
- SEO: page titles and descriptions, share image, `robots.txt`, sitemap, structured data; signed-in pages are never indexed
- Category tabs, search, filters (priority, due date, tag), sorting and status tabs, all saved in the URL
- Profile: photo upload (cropped square), edit name, username, email and bio, change or set password, delete account
- Dark and light mode, mobile friendly

## Run locally
```bash
cp .env .env.local   # add MONGODB_URI and SESSION_SECRET (without BREVO_API_KEY, emails print in the terminal)
npm install
npm run dev                  # http://localhost:3000
```

## Checks
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Deploy (Vercel)
1. MongoDB Atlas → Network Access → allow `0.0.0.0/0`.
2. Import this repo in Vercel.
3. Add env vars: `MONGODB_URI`, `MONGODB_DB=taskora`, `SESSION_SECRET` (32+ characters, e.g. `openssl rand -base64 32`).
   For sign-up emails and password reset add `BREVO_API_KEY` and `EMAIL_FROM` (a sender you verified in Brevo; see `AGENTS.md`, Section 4.5c). Also set `APP_URL` to your site's address (e.g. `https://taskora.vercel.app`, no trailing slash): search-engine links, the sitemap and share previews use it. For Google sign-in add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` too (setup steps in `AGENTS.md`, Section 10).
4. Deploy, then open `/api/health`. It should say `"database": "connected"` and `"email": "configured"`.

See `AGENTS.md` for architecture, conventions and how to add features.
