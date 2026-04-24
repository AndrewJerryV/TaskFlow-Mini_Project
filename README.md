# TaskFlow - AI-Powered Project Management

TaskFlow is a full-stack project management platform built with **Next.js**, **React**, **Supabase**, and an in-app **TypeScript ML engine**. It combines Kanban workflows, project analytics, real-time collaboration, and ML-assisted planning in a single app runtime.

---

## Key Features

### Project Management
- Kanban board with drag-and-drop task movement
- Backlog management with prioritization and filtering
- Calendar and timeline views for scheduling
- Rich task editing with assignees, due dates, status, and comments

### AI / ML Engine
- Priority prediction for tasks
- Smart task assignment using skills, workload, and wellness signals
- Bottleneck detection for overdue and stuck work
- Wellness monitoring for team load awareness
- Urgency scoring based on priority, due date, and task staleness
- Task clustering for related work detection
- Workload rebalancing suggestions
- Batch priority checks across tasks

### Collaboration
- Project room chat
- Direct messages between project members
- Message replies, reactions, and attachments
- Shared pages and documents
- Notifications and activity tracking
- Built-in video rooms

### Analytics & Reporting
- Summary dashboard with project health metrics
- Reports and charts
- User history and workload insights

### Administration
- Team dashboard for admins and managers
- Role-based access control
- Project creation and member assignment
- User settings and profile management

### Developer Tools
- Code view
- Deployments view
- Forms builder
- Time tracking
- Keyboard shortcuts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, clsx, tailwind-merge |
| UI | Lucide React, Framer Motion |
| Charts | Recharts |
| Drag and Drop | dnd-kit |
| Database and Auth | Supabase |
| ML Runtime | Shared TypeScript inference inside the Next.js app |
| ML Techniques | Priority scoring, skill matching, urgency analysis, wellness scoring, token similarity clustering |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Clone and install

```bash
git clone https://github.com/AndrewJerryV/TaskFlow-Mini_Project.git
cd task-flow
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ALTCHA_HMAC_SECRET=your_altcha_hmac_secret
ALTCHA_HMAC_KEY_SECRET=optional_second_secret_for_key_signatures
```

### 3. Run database migrations

Apply the SQL files in `supabase/migrations/` using the Supabase SQL Editor.

Important migration notes:
- Run the core schema migrations for `users`, `tasks`, `projects`, and related tables
- If migrating from `profiles`, run the merge and verification migrations
- If using the newer chat model, apply the latest `messages` table migration as well

### 4. Start the app

```bash
npm run dev
```

This starts only the Next.js application on `http://localhost:3000`.

---

## ML Runtime Notes

TaskFlow no longer requires a separate Python server for ML features at runtime.

- `npm run dev` starts only Next.js
- Server-side ML-backed features run through `lib/ml-engine.ts`
- Lightweight browser-side assistance runs through `lib/ml-browser.ts`
- Existing API routes call the in-app TypeScript engine instead of a separate localhost ML service
- The `ML/` folder remains only as legacy experiments and benchmark history

---

## Roles and Permissions

| Feature | Admin | Manager | Member |
|---------|:-----:|:-------:|:------:|
| Create Projects | Yes | No | No |
| Manage Team | Yes | Yes | No |
| Add Users | Yes | No | No |
| View Projects | Yes | Yes | Yes |
| Edit Tasks | Yes | Yes | Yes |
| View Analytics | Yes | Yes | Yes |
| Settings | Yes | Yes | Yes |

---

## Project Structure

```text
task-flow/
|- app/                    # Next.js App Router pages and API routes
|  |- api/                # AI, ML, tasks, team, chat, and other endpoints
|  |- login/              # Authentication
|  |- projects/           # Project workspace views
|  |- settings/           # User settings
|  `- team/               # Team management
|- components/            # React UI components
|- contexts/              # React contexts
|- lib/                   # Supabase helpers, ML engine, browser ML, utilities
|- supabase/              # SQL migrations
|- types/                 # Shared TypeScript types
|- ML/                    # Legacy Python experiments and archived benchmarks
`- product-page.html      # Product landing page
```

---

## License

This project is open source under the MIT License.
