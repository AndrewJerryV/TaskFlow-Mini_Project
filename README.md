# TaskFlow - Project Management App

TaskFlow is a comprehensive project management dashboard built with Next.js, featuring real-time team collaboration, ML-based task recommendations, forms, embedded whiteboard functionality, and a secure Supabase backend.

## 🚀 Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) account for the database and authentication.

### 1. Clone the Repository

Clone this repository to your local machine:

```bash
git clone <your-repository-url>
cd task-flow
```

### 2. Install Dependencies

Install the required packages using your preferred package manager:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Supabase Setup & Environment Variables

This project uses Supabase for authentication and PostgreSQL database storage.

1. Create a new project in your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a `.env.local` file in the root of your project.
3. Add the following environment variables. You can find these values in your Supabase project under **Project Settings > API**:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

*Note: The `SUPABASE_SERVICE_ROLE_KEY` is required for administrative RPC functions (like creating users) to work securely on the backend.*

### 4. Database Setup

You will need to run the necessary SQL scripts in your Supabase SQL Editor to set up the tables (`public.users`, `public.tasks`, etc.) and the Required RPC functions (e.g., `admin_create_user`).

If you previously used a `profiles` table, run the merge script in supabase/migrations/20260303_merge_profiles_into_users.sql to migrate and drop `profiles`.
Then run supabase/migrations/20260303_verify_profiles_merge.sql to verify no profile rows were missed.

If you see `relation "public.profiles" does not exist` when creating users, run supabase/migrations/20260304_fix_admin_create_user_v2.sql and then visit /api/admin/rpc-check to verify the RPC points at public.users.

*(If you have a `schema.sql` or migration file in your project, instruct the user to run it here. Example: copy the contents of `supabase/migrations` into the Supabase SQL editor and run it).*

### 5. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 👥 Authentication & Adding Users

- **Login:** The app uses Supabase Auth. Users can sign in with Email/Password or OAuth (Google, GitHub) if configured in your Supabase dashboard.
- **Admin Access:** To add new users to the team, you must be logged in as a user with the `Admin` role in the `public.users` table. Once logged in as an Admin, navigate to the **Team Dashboard** and click **"Add New User"**.

## 🛠️ Built With

- [Next.js](https://nextjs.org/) - React Framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Database & Authentication
- [Lucide React](https://lucide.dev/) - Icons
- [Framer Motion](https://www.framer.com/motion/) - Animations

## 📝 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
