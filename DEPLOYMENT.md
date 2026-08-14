# Render Deployment Guide

This project includes automated configuration (`render.yaml`) and dynamic URL resolution for zero-config deployment on Render.

---

## ⚡ Option 1: 1-Click Render Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** ➔ **Blueprint**.
2. Connect your GitHub repository: `https://github.com/MayankShukal/Skillforge.git`.
3. Render will automatically read `render.yaml` and create both:
   - **`skillforce-backend`** (Node.js Web Service)
   - **`skillforce-frontend`** (Static Site with SPA rewrite rules & automatic API URL injection)
4. Add your **`GEMINI_API_KEY`** in the `skillforce-backend` environment variables.
5. Click **Apply**!

---

## 🛠️ Option 2: Manual Render Setup

### 1. Deploy Backend (Web Service)
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: `5000`
  - `DATABASE_URL`: `file:./dev.db`
  - `JWT_SECRET`: *(Any random string, e.g. `skillforge-jwt-secret-2026`)*
  - `GEMINI_API_KEY`: *(Your Google Gemini API key)*
  - `OPENAI_API_KEY`: *(Optional)*

### 2. Deploy Frontend (Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Redirects / Rewrites**:
  - **Type**: `Rewrite`
  - **Source**: `/*`
  - **Destination**: `/index.html`
- **Environment Variables**:
  - `VITE_API_URL`: `https://your-backend-service-name.onrender.com`

---

## 🔄 Automatic URL Pairing
The frontend automatically pairs with the backend on Render:
- If frontend is `https://skillforge-frontend.onrender.com`, it automatically connects to `https://skillforge-backend.onrender.com` even if `VITE_API_URL` is omitted.
- Local development continues to seamlessly target `http://localhost:5000` or local network IP addresses.
