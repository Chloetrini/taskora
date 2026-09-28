# Taskora

A to-do list with accounts, notes, subtasks, tags, filters and a profile, built with Next.js 16, MongoDB and TypeScript. HNG 15, Week 1.

## Features
- **Multi-tenant**: every user has their own account and fully isolated data in a shared database
- Sign up and log in with email/username or **Google**, with confirm password and a live "username available" check
- Dashboard: today's date as the headline, progress, stats, overdue, due today and up next
- Tasks with notes, priority, category, tags, due date, subtasks and pinning
- Tasks shown as cards with Edit and Delete buttons (Delete asks to confirm)
- Category tabs, search, filters (priority, due date, tag), sorting and status tabs, all saved in the URL
- Profile: edit name, username, email and bio, change password, delete account
- Dark and light mode, mobile friendly

## Run locally
```bash
cp .env.env.local   # add MONGODB_URI and SESSION_SECRET
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
   For Google sign-in also add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `APP_URL` (setup steps in `AGENTS.md`, Section 10).
4. Deploy, then open `/api/health`. It should say `"database": "connected"`.

See `AGENTS.md` for architecture, conventions and how to add features.
