# TaskFlow — AI-Powered Project Management

TaskFlow is a full-stack project management platform built with **Next.js** and a **Python ML backend**. It combines intuitive Kanban workflows with machine-learning-powered recommendations, bottleneck detection, and team wellness monitoring to help teams ship faster and work healthier.

> **Live product page:** Open `product-page.html` for an interactive overview.

---

## Key Features

### Project Management
- **Kanban Board** — Drag-and-drop task management with customizable columns (To Do, In Progress, Review, Done)
- **Backlog View** — Prioritized backlog with filtering and bulk actions
- **Calendar View** — Timeline-based task visualization with due-date tracking
- **Timeline / Gantt View** — Project timeline for scheduling and dependency planning
- **Task Detail Modal** — Rich task editing with descriptions, priority, status, assignees, due dates, and comments

### AI / ML Engine (Python FastAPI)
- **Priority Prediction** — Fine-tuned SetFit model classifying tasks as Low, Medium, High, or Critical (88% accuracy, 82% macro F1)
- **Smart Task Assignment** — SentenceTransformer-based skill matching ranks team members by relevance (top-3 hit rate: 87%)
- **Bottleneck Detection** — Detects WIP limit breaches, aging work-in-progress, and overdue tasks per project
- **Wellness Monitoring** — Heuristic burnout scoring based on active tasks, priority load, and critical urgency count
- **Urgency Scoring** — Rule-based urgency model combining priority, status, days-until-due, and staleness
- **Task Clustering** — Cosine-similarity clustering to surface related/duplicate tasks
- **Workload Rebalancing** — Suggests task reassignments from overloaded members to available ones using skill + wellness scoring
- **Batch Priority Check** — Bulk inference across all tasks for priority mismatch detection

### Collaboration
- **Real-time Chat** — Team messaging with threads and mentions
- **Video Conferencing** — Built-in video rooms for meetings
- **Shared Pages** — Collaborative documents and whiteboards
- **Notifications** — Bell-icon notification system with read/unread states
- **Activity Feed** — Project-level activity log

### Analytics & Reporting
- **Summary Dashboard** — Project health metrics, velocity charts, and status distributions (Recharts)
- **Reports View** — Exportable analytics with burndown charts and team performance data
- **User History Modal** — Per-member task history and contribution tracking
- **User Stats Cards** — At-a-glance workload and performance indicators

### Administration
- **Team Dashboard** — Admin/Manager panel for managing members, roles, and permissions
- **User Settings** — Profile management and company-size configuration for adaptive thresholds
- **Role-Based Access** — Admin, Manager, and Member roles controlling feature visibility
- **Project Creation** — Admin-only project setup with key, description, and member assignment

### Developer Tools
- **Code View** — Repository browsing with GitHub integration
- **Deployments View** — Deployment tracking and status monitoring
- **Shortcuts** — Keyboard shortcut system for power users
- **Time Tracking** — Timer-based time entries with running indicators and history
- **Forms Builder** — Custom form creation and management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS, clsx, tailwind-merge |
| **UI** | Lucide React (icons), Framer Motion (animations) |
| **Charts** | Recharts |
| **Drag & Drop** | dnd-kit |
| **Database & Auth** | Supabase (PostgreSQL + Auth) |
| **ML Backend** | Python, FastAPI, Uvicorn |
| **ML Models** | SetFit (sentence-transformers), scikit-learn TF-IDF |
| **Dev Tools** | Concurrently, ESLint, PostCSS |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://www.python.org/) 3.10+
- A [Supabase](https://supabase.com/) account

### 1. Clone & Install

```bash
git clone https://github.com/AndrewJerryV/TaskFlow-Mini_Project.git
cd task-flow

# Frontend dependencies
npm install

# ML backend dependencies
pip install -r ML/requirements.txt
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ALTCHA_HMAC_SECRET=your_altcha_hmac_secret
ALTCHA_HMAC_KEY_SECRET=optional_second_secret_for_key_signatures
```

### 3. Database Setup

Run the SQL migrations in your Supabase SQL Editor:

1. Run scripts in `supabase/migrations/` to create tables (`public.users`, `public.tasks`, etc.) and RPC functions
2. If migrating from a `profiles` table, run `20260303_merge_profiles_into_users.sql` then `20260303_verify_profiles_merge.sql`
3. If you see `relation "public.profiles" does not exist` errors, run `20260304_fix_admin_create_user_v2.sql`

### 4. Run the App

The dev script starts both Next.js and the Python ML server concurrently:

```bash
npm run dev
```

This runs:
- **Next.js** on `http://localhost:3000`
- **FastAPI ML server** on `http://127.0.0.1:8000`

---

## ML Model Performance

| Model | Metric | Score |
|-------|--------|-------|
| **SetFit Priority** | Accuracy | 88.1% |
| **SetFit Priority** | Macro F1 | 82.0% |
| **Skill Matcher** | Top-3 Hit Rate | 86.6% |
| **Skill Matcher** | Embedding Dim | 384 |
| **Urgency Model** | Throughput | 2.2M pred/sec |
| **Wellness Model** | Throughput | 3.4M pred/sec |

Full benchmark details in [`ML/benchmark_results_summary.md`](ML/benchmark_results_summary.md).

---

## Roles & Permissions

| Feature | Admin | Manager | Member |
|---------|:-----:|:-------:|:------:|
| Create Projects | ✅ | ❌ | ❌ |
| Manage Team | ✅ | ✅ | ❌ |
| Add Users | ✅ | ❌ | ❌ |
| View All Projects | ✅ | ✅ | ✅ |
| Edit Tasks | ✅ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ |

---

## Project Structure

```
task-flow/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # 23 API route groups (ai, ml, tasks, team, etc.)
│   ├── login/              # Authentication page
│   ├── projects/           # Project views
│   ├── settings/           # User settings
│   └── team/               # Team management
├── components/             # React components
│   ├── TaskBoard.tsx       # Kanban board
│   ├── MLTaskRecommendations.tsx  # AI recommendation cards
│   ├── BottleneckAlert.tsx # Bottleneck detection UI
│   ├── WellnessAlerts.tsx  # Wellness monitoring UI
│   ├── SummaryView.tsx     # Dashboard analytics
│   ├── ChatView.tsx        # Real-time chat
│   ├── ReportsView.tsx     # Reports & charts
│   └── ...                 # 27 component files total
├── ML/                     # Python ML backend
│   ├── main.py             # FastAPI server with all endpoints
│   ├── models.py           # SetFit, TaskAssigner, UrgencyModel
│   ├── wellness_model.py   # Wellness scoring model
│   ├── train.py            # Model training script
│   └── benchmark_*.py/json # Benchmark scripts & results
├── contexts/               # React contexts (Auth, etc.)
├── lib/                    # Supabase client & utilities
├── types/                  # TypeScript type definitions
├── supabase/               # Database migrations
└── product-page.html       # Product landing page
```

---

## License

This project is open source under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using Next.js, Supabase & Machine Learning
</p>
