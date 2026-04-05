# HRMS — Human Resource Management System

A modern, full-stack Human Resource Management System built with Next.js and Supabase. HRMS provides organizations with a centralized platform to manage employees, attendance, leave requests, payroll, and other core HR operations through a clean, professional interface.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Hosting:** Vercel (frontend), Supabase (backend services)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) account and project

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd HRMS
   ```

2. **Install frontend dependencies:**

   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables:**

   Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and replace the placeholder values with your Supabase project URL, anon key, service role key, and database connection string.

4. **Run the development server:**

   ```bash
   cd frontend
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

## Folder Structure

```
HRMS/
├── frontend/      # Next.js front-end application (pages, components, styles)
├── backend/       # Supabase backend code (migrations, seed data, edge functions)
├── docs/          # Documentation files (development rules, architecture decisions)
├── .env           # Environment variables for local development (git-ignored)
├── .env.example   # Example environment variables with placeholder values
├── .gitignore     # Files and directories excluded from version control
└── README.md      # Project documentation
```

| Folder / File  | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `frontend/`    | Contains the Next.js application — all pages, components, and styles.   |
| `backend/`     | Houses Supabase migrations, seed scripts, and edge functions.           |
| `docs/`        | Project documentation including development rules and design decisions. |
| `.env`         | Local environment variables (never committed to version control).       |
| `.env.example` | Template showing required environment variables with safe placeholders. |
| `.gitignore`   | Specifies files and directories that Git should ignore.                 |

## Development Rules

All contributors must follow the standards defined in [`docs/development_rules.md`](docs/development_rules.md). This covers UI guidelines, commit conventions, security practices, code quality, and performance expectations.

## License

This project is proprietary. All rights reserved.
