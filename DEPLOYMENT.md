# Deployment (Render)

This app has three pieces on Render:

- `backend`: Express API — deployed as a Render **Web Service**
- Render **Postgres** database (attached to the backend)
- `frontend`: Vite React static app — deployed as a Render **Static Site**

## Database

Create a Render Postgres instance first. Copy its **Internal Database URL** (same-region services can use the internal URL; use the External URL if connecting from outside Render, e.g. to run migrations from your machine).

## Backend

Deploy `backend` as a Node.js Web Service. Root directory: `backend`.

Build command:

```bash
npm install && npm run build && npm run prisma:deploy
```

(`npm run build` already runs `prisma generate` before `tsc`; `prisma:deploy` applies migrations to the connected Postgres database.)

Start command:

```bash
npm start
```

Environment variables:

```bash
DATABASE_URL=<Render Postgres connection string>
JWT_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=optional-openai-key
GEMINI_API_KEY=optional-gemini-key
```

Render sets `PORT` automatically — the server already reads it via `process.env.PORT`, no change needed.

## Frontend

Deploy `frontend` as a Static Site. Root directory: `frontend`.

Build command:

```bash
npm install
npm run build
```

Publish directory:

```bash
dist
```

Environment variables:

```bash
VITE_API_URL=https://your-backend-service.onrender.com
```

After changing `VITE_API_URL`, rebuild and redeploy the frontend (it's baked in at build time, not read at runtime).

The app uses React Router's `BrowserRouter`, so client-side routes (e.g. `/dashboard/roadmap`) need a rewrite to `index.html` or they'll 404 on refresh. A `public/_redirects` file (`/*  /index.html  200`) is already included and gets copied into `dist/` on build, which Render's static site host picks up automatically.
