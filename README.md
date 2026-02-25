# TeacherVault 📚

AI-Powered Teaching Resource Library built with Next.js, Supabase, and Claude AI.

## Setup Guide (Step by Step)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Name it `teachervault`
4. Set a database password (save this somewhere)
5. Choose a region close to you
6. Click **Create new project** and wait for it to finish

### 2. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the ENTIRE contents of `supabase-setup.sql` and paste it in
4. Click **Run** (or Ctrl+Enter)
5. You should see "Success. No rows returned" — that's correct!

### 3. Get Your Supabase Keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy these two values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (the long string under "Project API keys")

### 4. Enable Email Auth

1. Go to **Authentication** → **Providers** in Supabase
2. Make sure **Email** is enabled
3. For testing, you can disable "Confirm email" under Email settings

### 5. Set Up the Project Locally

```bash
# Clone or copy the project files to your computer
# Then install dependencies:
npm install

# Create your environment file:
cp .env.local.example .env.local
```

Edit `.env.local` with your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ANTHROPIC_API_KEY=your-claude-api-key
```

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click **Import Project** → select your GitHub repo
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Click **Deploy**

Your app will be live at `your-project.vercel.app`!

---

## Features (Phase 1)

- ✅ Upload resources (PDF, PPT, Word, images)
- ✅ Search & filter by category, type, grade, curriculum
- ✅ Favorites
- ✅ Recently viewed
- ✅ Duplicate detection on upload
- ✅ Grid & list view
- ✅ Resource detail panel with metadata
- ✅ Teacher notes on resources
- ✅ Teacher accounts (email/password auth)

## Coming Soon

- 🔜 AI auto-tagging (Phase 2)
- 🔜 AI story profiles (Phase 2)
- 🔜 "Find me something for..." AI search (Phase 2)
- 🔜 Into Reading curriculum browser (Phase 3)
- 🔜 PDF splitting (Phase 3)
- 🔜 Collections & custom tags (Phase 3)
- 🔜 Share links (Phase 4)
