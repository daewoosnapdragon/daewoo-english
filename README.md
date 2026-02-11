# Daewoo English Program — School Management System

A comprehensive web application for managing the Daewoo Elementary School English Program.

## Features (Module 1 - Foundation)
- ✅ Project scaffolding (Next.js + TypeScript + Tailwind)
- ✅ Full database schema (18 tables covering all features)
- ✅ Korean/English language toggle
- ✅ Role-based view selector (teacher vs admin)
- ✅ Sidebar navigation with all planned modules
- ✅ Dashboard with program-wide stats and charts
- ✅ Student roster with search, filter, sort-for-printing
- ✅ Excel roster upload UI
- ✅ Duplicate student number detection
- ✅ Type definitions for entire system
- ✅ Internationalization (Korean + English)
- ✅ Utility functions (grading calculations, sorting, validation)
- ✅ School logo integrated

## Planned Modules
- **Module 2**: Grade Entry & Dashboards (spreadsheet mode, student mode, bulk entry)
- **Module 3**: Reports & Printing (PDF generation, sort-for-printing, warning letters)
- **Module 4**: Level Testing (score entry, composite calculation, placements)
- **Module 5**: Portfolios & Extras (behavior logs, attendance, ORF tracking, checklists)

## Tech Stack
- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS + custom design system
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer
- **Excel**: SheetJS (xlsx)
- **AI**: Anthropic Claude API (for comment drafting)
- **Hosting**: Vercel

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and choose a name (e.g., "daewoo-english")
3. Save your database password somewhere safe
4. Once created, go to **Settings → API** and copy:
   - Project URL (looks like `https://xxxxx.supabase.co`)
   - Anon public key (starts with `eyJ...`)

### 2. Set Up the Database
1. In Supabase, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Paste the entire contents into the SQL Editor
4. Click "Run" — this creates all 18 tables and views

### 3. Configure the App
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Install and Run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel
1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add your environment variables in Vercel's settings
4. Deploy — your app will be live at `daewoo-english.vercel.app`

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `school_settings` | School name, principal, grading scale, thresholds |
| `teachers` | Staff members and their class assignments |
| `students` | Master roster with Korean/English names, class info |
| `semesters` | Reporting periods (Fall Mid, Fall Final, Spring Mid, Spring Final) |
| `assessments` | Individual assignments/tests with standards mapping |
| `grades` | Score per student per assessment |
| `semester_grades` | Rolled-up final grades per domain per reporting period |
| `summative_scores` | Assessment A/B scores |
| `comments` | Teacher comments per student per semester |
| `comment_bank` | Shared comment phrases library |
| `behavior_logs` | Timestamped behavior notes |
| `level_tests` | Level test configuration with weights |
| `level_test_scores` | Raw + calculated scores per student |
| `level_test_placements` | Final placement decisions with overrides |
| `attendance` | Daily attendance records |
| `reading_assessments` | ORF tracking (CWPM, accuracy, levels) |
| `checklists` | Semester kickoff checklists |
| `warnings` | Academic/behavior warning letters |
| `audit_log` | Version history for all changes |
| `roster_uploads` | History of Excel roster imports |

## File Structure
```
src/
├── app/                  # Next.js pages
│   ├── layout.tsx        # Root layout with providers
│   ├── page.tsx          # Main app shell with routing
│   └── globals.css       # Global styles + Tailwind
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx   # Navigation sidebar
│   ├── ui/
│   │   └── Toast.tsx     # Toast notifications
│   ├── dashboard/
│   │   └── DashboardView.tsx
│   └── students/
│       └── StudentsView.tsx
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── context.tsx        # Global app state (teacher, language, semester)
│   └── utils.ts           # Utility functions
├── types/
│   └── index.ts           # TypeScript type definitions
└── i18n/
    └── translations.ts    # Korean/English strings
```
