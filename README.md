# AppForge v2 — AI App Schema Generator

> A full-stack React app that converts natural language prompts into validated, executable app schemas via a 6-stage AI pipeline. Built with engineering maturity: intent confirmation, auto-repair, runtime simulation, benchmarking.

---

## What's New in v2

- **Landing page** — public intro with features + CTA before any login
- **Intent Confirmation** — after Stage 1, the AI shows what it understood and asks you to confirm or edit before proceeding. No more surprise outputs.
- **Normal font** — switched from monospace everywhere to Inter (clean, readable)
- **API key is hidden** — the key field in Settings shows only first 7 + last 4 characters, never the full key
- **Settings revamped** — profile card, hidden API key, browser notifications toggle, session history, delete account
- **Projects tab** — replaces "My Apps", shows only saved projects (empty state if none)
- **Instructions tab** — save custom pipeline instructions (tech stack, naming conventions, etc.)
- **Invite tab** — share a referral link or invite by email
- **Fast routing** — auth state resolves immediately, no "Loading authentication…" spinner blocking navigation
- **Light mode default** — cleaner for presentations

---

## Project Structure

```
src/
├── lib/
│   ├── firebase.js          Firebase init
│   ├── pipeline.js          6-stage AI pipeline (accepts apiKey as param)
│   ├── benchmarks.js        20 benchmark prompts + scoring
│   └── store.js             Zustand global state
├── contexts/
│   └── AuthContext.jsx      Firebase auth (non-blocking)
├── components/
│   ├── layout/Layout.jsx    Sidebar navigation
│   ├── pipeline/PipelineStages.jsx  Live stage tracker
│   └── ui/JsonPreview.jsx   JSON viewer + visual preview
├── pages/
│   ├── LandingPage.jsx      Public landing (no login needed)
│   ├── LoginPage.jsx        Google sign-in
│   ├── GeneratePage.jsx     Prompt → pipeline → output (with intent confirmation)
│   ├── ProjectsPage.jsx     Saved projects library
│   ├── WorkflowPage.jsx     Live pipeline document
│   ├── BenchmarkPage.jsx    20-test evaluation framework
│   ├── SettingsPage.jsx     Profile, API key, notifications, history, delete account
│   ├── InstructionsPage.jsx Custom pipeline instructions
│   └── InvitePage.jsx       Invite friends by link or email
├── App.jsx                  Router: / (landing), /login, /app/* (protected)
├── main.jsx
└── index.css
```

---

## Setup: Step by Step

### Step 1 — Install Node.js dependencies

```bash
npm install
```
Requires Node.js 18+.

---

### Step 2 — Get your Anthropic API Key

1. Go to **https://console.anthropic.com/settings/keys**
2. Click **Create Key**
3. Copy the key (starts with `sk-ant-api03-...`)

You can add this in the app's **Settings tab** after logging in — you don't need to put it in `.env` (though you can for local dev).

---

### Step 3 — Create a Firebase Project

1. **https://console.firebase.google.com** → Add project → name it `appforge`
2. **Enable Google Auth:**
   - Authentication → Get started → Google → Enable → Save
3. **Enable Firestore:**
   - Firestore Database → Create database → Start in test mode → Choose region → Enable
4. **Get config keys:**
   - Project Settings (gear) → General → Your apps → Add app → Web
   - Register app, copy the `firebaseConfig` object

**Firestore security rules** (paste in Firestore → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /apps/{appId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
  }
}
```

---

### Step 4 — Create `.env` file

```bash
cp .env.example .env
```

Fill in your values:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY    # optional for local dev, can use Settings tab instead
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
```

---

### Step 5 — Run locally

```bash
npm run dev
```

Open **http://localhost:5173**

**First time flow:**
1. See the landing page → click "Get Started"
2. Sign in with Google
3. Go to **Settings** → add your Anthropic API key (it's stored locally, masked)
4. Go to **Generate** → type a prompt → click Generate
5. Review the **intent confirmation card** → approve or edit → pipeline continues

---

### Step 6 — Deploy to Vercel

**Option A: CLI**
```bash
npm install -g vercel
vercel login
vercel
# When asked: Framework = Vite
```

**Option B: GitHub + Vercel Dashboard**
1. Push to GitHub:
```bash
git init && git add . && git commit -m "AppForge v2"
git remote add origin https://github.com/YOUR_USERNAME/appforge.git
git push -u origin main
```
2. Go to **vercel.com/new** → Import repo
3. Framework: **Vite** (auto-detected)
4. Add all 7 environment variables in the Vercel dashboard
5. Deploy
6. After deploy, add your `*.vercel.app` URL to Firebase:
   - Authentication → Settings → Authorized domains → Add domain

---

## How the Pipeline Works

### The Intent Confirmation Gate (New in v2)

After Stage 1 (Intent Extraction), the pipeline **pauses** and shows you a card:

```
┌─────────────────────────────────────────────┐
│ Here's what I understood — does this look   │
│ right?                                      │
│                                             │
│ App Type:  CRM          Name: SalesForce    │
│ Auth: Yes               Payments: Yes       │
│ Features: [contacts] [deals] [payments]     │
│ Entities: users, contacts, deals            │
│                                             │
│ [Yes, build this]  [Edit prompt]            │
└─────────────────────────────────────────────┘
```

- **Yes, build this** → continues to Stage 2 onwards
- **Edit prompt** → expands a text area; clicking "Re-analyse" restarts from Stage 1 with your edited prompt

This eliminates bad outputs from misunderstood prompts.

---

### Stage Breakdown

| Stage | Input | Output | AI? |
|-------|-------|--------|-----|
| 1. Intent Extraction | Raw prompt | Structured JSON (type, features, roles, confidence) | ✅ Claude |
| 2. Architecture | Intent JSON | Entities, pages, flows, complexity | ✅ Claude |
| 3. Schema Generation | Intent + Architecture | DB + API + UI + Auth schemas | ✅ Claude |
| 4. Validation | All schemas | Errors + warnings list | ❌ Pure logic |
| 5. Repair | Schemas + errors | Fixed schemas + repair log | ✅ Claude (hard issues only) |
| 6. Runtime Simulation | Repaired schemas | Mock data, route checks, execution score | ❌ Pure logic |

---

## Settings Tab Guide

| Setting | What it does |
|---------|-------------|
| Profile | Shows your Google profile picture, name, email, join date |
| Anthropic API Key | Hidden field — shows first 7 + last 4 chars only. Click "Update" to change it |
| Theme | Toggle light/dark mode |
| Browser Notifications | Request permission to get notified when pipeline completes |
| Session History | View/clear this session's generation history |
| Sign Out | Logs you out, returns to landing |
| Delete Account | Deletes all Firestore data + Firebase account (requires confirmation) |

---

## API Key Security

- Your Anthropic key is stored in `localStorage` under the key `af_key`
- It is **never displayed in full** in the UI (masked as `sk-ant-a••••••••••••••••••••3h7k`)
- It is sent **directly from your browser to Anthropic's API** — it never passes through any intermediate server
- Firebase keys (`VITE_FIREBASE_*`) are intentionally public-safe — Firebase security rules control actual data access

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Loading authentication…" forever | Check Firebase config in `.env`. Open browser console for errors. |
| "API key missing" error | Go to Settings → add your Anthropic key |
| Google login popup blocked | Allow popups for localhost in browser settings |
| Firebase "permission denied" | Check Firestore security rules, check Authorized domains |
| Vercel: blank page after deploy | Ensure `vercel.json` exists with the SPA rewrite rule |
| Google login fails on Vercel | Add your `*.vercel.app` domain to Firebase Authorized domains |
| Build fails | Run `npm install`, check Node.js ≥ 18 (`node -v`) |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS + Inter font |
| State | Zustand |
| Auth | Firebase Authentication (Google) |
| Database | Firebase Firestore |
| AI | Anthropic Claude (claude-sonnet-4) |
| Deploy | Vercel |
