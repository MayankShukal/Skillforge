# Deployment

This app has two deployable parts:

- `frontend`: Vite React static app
- `backend`: Express API with Prisma SQLite

## Backend

Deploy `backend` as a Node.js web service.

Build command:

```bash
npm install
npm run build
npm run prisma:deploy
```

Start command:

```bash
npm start
```

Environment variables:

```bash
DATABASE_URL=file:./dev.db
JWT_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=optional-openai-key
```

For a real production app, use a hosted database instead of local SQLite so user data survives redeploys.

## Frontend

Deploy `frontend` as a static Vite app.

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
VITE_API_URL=https://your-deployed-backend-url
```

After changing `VITE_API_URL`, rebuild and redeploy the frontend.
