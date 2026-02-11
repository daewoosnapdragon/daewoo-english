# GitHub Desktop Setup Guide

## One-Time Setup (5 minutes)

### Step 1: Download GitHub Desktop
- Go to **https://desktop.github.com**
- Click **Download for Mac** (or Windows)
- Install it like any app

### Step 2: Sign In
- Open GitHub Desktop
- Click **Sign in to GitHub.com**
- Use the same GitHub account that has the `daewoo-english` repo

### Step 3: Clone Your Repo
- Click **Clone a repository from the Internet**
- Find `daewoo-english` in the list (or search for it)
- Choose where to save it on your computer (e.g., Desktop or Documents)
- Click **Clone**

That's it for setup! You now have the project on your computer.

---

## Updating the App (every time I give you new files)

### Step 1: Replace Files
- I'll give you updated files (usually a .tar or individual files)
- Open the project folder on your computer
- Replace the old files with the new ones (drag and drop, overwrite when asked)

### Step 2: Commit & Push
- Open **GitHub Desktop**
- You'll see all the changed files listed on the left
- Type a short message in the "Summary" box at the bottom left (e.g., "grade entry upgrades")
- Click the blue **Commit to main** button
- Click **Push origin** at the top

### Step 3: Done!
- Vercel will automatically detect the push and deploy your updated site
- Wait ~1-2 minutes, then check https://daewoo-english.vercel.app

---

## Quick Visual Reference

```
You get new files from Claude
        ↓
Replace files in your local daewoo-english folder
        ↓
Open GitHub Desktop → see changes listed
        ↓
Type a message → click "Commit to main"
        ↓
Click "Push origin"
        ↓
Vercel auto-deploys → site is updated!
```

---

## Troubleshooting

**"I don't see any changes"**
→ Make sure you saved the new files into the correct `daewoo-english` folder (the one GitHub Desktop cloned)

**"Push failed"**
→ Try clicking **Fetch origin** first, then push again

**"Vercel didn't deploy"**
→ Go to vercel.com, check your project dashboard. Make sure the env vars are still set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
