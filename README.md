# LOOM.AI

**Your emails, written the way you would write them.**

LOOM AI is a personalized AI email-writing assistant that learns from your writing style, adapts across 6 distinct tones, and crafts natural, bespoke emails.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (Auth & PostgreSQL with Row Level Security)**.

---

## 🎨 Visual Identity & Logo Asset

LOOM AI features a near-black (`#09090b`) aesthetic with dark charcoal panels, crisp typography, and restrained neon magenta, purple, electric-blue, and cyan accents.

### Logo Asset Placement
Please ensure the official LOOM AI logo asset is placed at:
```bash
public/loom-logo.png
```
*(If the asset is not yet placed, the app will gracefully render an animated glowing orb fallback).*

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) account (free tier)
- *(Optional)* Apple Silicon Mac for local MLX model inference, or any OpenAI-compatible API endpoint

### 2. Install Dependencies
```bash
cd loom-ai
npm install
```

### 3. Environment Variables
Copy the template to your local environment file:
```bash
cp .env.example .env.local
```
Fill in the values in `.env.local`:
```env
# Model API (e.g. Local MLX server or OpenAI)
MODEL_API_URL=http://localhost:8080/v1/chat/completions
MODEL_API_KEY=

# Supabase Auth & Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Database & Security Setup

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
4. This script automatically sets up:
   - `profiles`: User preferences, category, baseline tone, style sample, and onboarding status.
   - `conversations`: Chat sessions tied to `auth.users(id)`.
   - `messages`: Multi-turn messages linked to conversations.
   - **Row Level Security (RLS)**: Strict policies guaranteeing users can only read, write, or delete their own data.
   - **Automatic Profile Trigger**: Automatically initializes a user profile row whenever a new user signs up.

---

## 🔑 Google OAuth Setup (Supabase)

To enable "Sign in with Google":

1. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
   - Create an **OAuth 2.0 Client ID** (Web Application).
   - In **Authorized redirect URIs**, add your Supabase Auth callback URL:
     ```
     https://<YOUR-PROJECT-ID>.supabase.co/auth/v1/callback
     ```
   - Copy the generated **Client ID** and **Client Secret**.

2. **Supabase Dashboard**:
   - Go to **Authentication** -> **Providers** -> **Google**.
   - Toggle **Enable Google provider**.
   - Paste your **Client ID** and **Client Secret**.
   - Under **URL Configuration**, set:
     - **Site URL**: `http://localhost:3000` (or `https://your-domain.vercel.app` in production)
     - **Redirect URLs**: Add both `http://localhost:3000/auth/callback` and `https://your-domain.vercel.app/auth/callback`.

---

## 🤖 Model Inference Setup

LOOM AI connects to any OpenAI-compatible API or your fine-tuned model weights at `huggingface.co/gautamagrawal/loom`.

### Option A: Local MLX Inference on Apple Silicon ($0 Cost)
Your model was fine-tuned in MLX. You can serve it locally using the built-in `mlx-lm` server:
```bash
python3 -m mlx_lm.server --model gautamagrawal/loom --port 8080
```
Then configure in `.env.local`:
```env
MODEL_API_URL=http://localhost:8080/v1/chat/completions
MODEL_API_KEY=
```

### Option B: Cloud or OpenAI-compatible Endpoint
Set `MODEL_API_URL` to your remote endpoint:
```env
MODEL_API_URL=https://api.openai.com/v1/chat/completions
MODEL_API_KEY=your-api-key
```

---

## 🚢 Vercel Deployment

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Upgrade LOOM AI with Supabase Auth, Onboarding & Dark Theme"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Import your repository in [vercel.com/new](https://vercel.com/new).
   - In **Environment Variables**, add:
     - `MODEL_API_URL`
     - `MODEL_API_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click **Deploy**.

3. **Update Supabase Redirect URLs**:
   - In Supabase Dashboard -> **Authentication** -> **URL Configuration**:
   - Add your production Vercel URL to **Redirect URLs**:
     ```
     https://<your-project>.vercel.app/auth/callback
     ```

---

## 🛡️ Architecture & Security Highlights

- **Server-Side Session Validation**: Authenticated routes (`/app`, `/onboarding`) are verified via Next.js middleware and Supabase SSR cookies. Client-side user IDs are never trusted blindly.
- **Row Level Security (RLS)**: PostgreSQL enforces isolation at the database layer.
- **No Model Fallbacks / Fake Answers**: If the model API is unreachable or unconfigured, `/api/chat` returns a clear error status code rather than hallucinating an answer.
- **Dual Storage & Seamless Migration**: Existing local conversations from earlier sessions are safely migrated into the user's Supabase account upon first sign-in without data loss.
