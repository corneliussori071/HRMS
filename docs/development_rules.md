# Development Rules

This document defines the engineering standards for the HRMS project. Every contributor — human or AI — must follow these rules without exception. They exist to keep the codebase clean, secure, performant, and professional. If something isn't covered here, default to the simplest solution that a senior engineer would be comfortable shipping to production.

---

## 1. UI Rules

The interface is an enterprise tool, not a marketing site. It should feel like Stripe, Linear, or Vercel — calm, information-dense, and fast.

- **No emojis.** Not in headings, labels, buttons, toasts, or empty states. Plain text only.
- **No decorative icons.** Every icon must serve a clear functional purpose (e.g., a chevron indicating a dropdown, a search icon in an input). If removing the icon doesn't reduce clarity, remove it.
- **Professional typography.** Use a single sans-serif font family. Maintain consistent font sizes, weights, and line heights across the application. Stick to a defined type scale — don't invent sizes.
- **Consistent spacing and alignment.** Use Tailwind's spacing scale (`p-4`, `gap-6`, `mt-8`) and avoid arbitrary values. Elements should align to a visible grid.
- **Neutral color palette.** Grays for backgrounds and borders. A single primary accent color for interactive elements. Use semantic colors sparingly: red for destructive actions, green for success, amber for warnings.
- **Readability over flair.** Prioritize legible text, clear hierarchy, and scannable layouts. No gradients, shadows, or animations unless they solve a usability problem.
- **Tailwind conventions.** Use utility classes directly in components. Extract repeated patterns into shared components, not into custom CSS. Avoid `@apply` except in global base styles.
- **Component library usage.** When using a component library (e.g., shadcn/ui, Radix), follow its conventions. Don't fight the library — extend it through composition, not overrides.

---

## 2. GitHub Rules

A clean commit history is as important as clean code. Every commit should tell a clear story about what changed and why.

- **Small, incremental commits.** Each commit represents exactly one logical change. Don't mix a bug fix with a refactor. Don't bundle new features with formatting changes.
- **Conventional commit messages.** Use the following prefixes:
  - `feat:` — A new feature or user-facing behavior.
  - `fix:` — A bug fix.
  - `docs:` — Documentation changes only.
  - `chore:` — Tooling, dependencies, configs — no production code changes.
  - `refactor:` — Code restructuring with no behavior change.
  - `test:` — Adding or updating tests.
  - `style:` — Formatting, whitespace, or linting — no logic changes.
- **Descriptive messages.** The message after the prefix should explain *what* changed in plain English. Good: `feat: add employee search by department`. Bad: `feat: update`.
- **No monolithic commits.** If a commit touches more than 3–4 unrelated files for different reasons, it's too big. Break it up.
- **Linear history.** Use rebase over merge when pulling changes. Avoid unnecessary merge commits.
- **Branching strategy.** Use `main` as the stable branch. Create feature branches named `feat/<short-description>`, bug fix branches named `fix/<short-description>`. Keep branches short-lived — merge or delete within days, not weeks.

---

## 3. Security Rules

A single leaked secret can compromise the entire system. Treat security as a non-negotiable baseline, not a nice-to-have.

- **Never commit secrets.** No API keys, database passwords, tokens, or credentials in source code. Not even "temporarily."
- **Use `.env` files for all sensitive configuration.** Every environment-specific or secret value must be read from environment variables at runtime.
- **`.env` and `.env.local` must be in `.gitignore`.** Verify this before every push. If you see a `.env` file in a commit diff, stop and fix it immediately.
- **`.env.example` documents required variables.** This file is committed and contains every variable name with a placeholder value like `your_supabase_project_url`. It never contains real credentials.
- **Review before pushing.** Run `git diff --cached` before every commit. Look specifically for anything that resembles a key, token, or password.
- **No console logging of secrets.** Never log API keys, tokens, session data, or credentials in any environment — development included. Use structured logging for debugging. Scrub sensitive fields.

---

## 4. Backend Safety

The backend is the last line of defense. Assume the client is compromised. Validate everything server-side.

- **Database credentials stay in environment variables.** The connection string, service role key, and any third-party API keys are read from `process.env` or Supabase's built-in secrets management. They never appear in source files.
- **Supabase Row-Level Security (RLS).** Every table that stores user data must have RLS enabled. Write policies that are as restrictive as possible — users should only access their own data unless explicitly granted broader access.
- **Validate all user input.** Use schema validation (e.g., Zod) on every API route and edge function. Validate types, lengths, formats, and ranges. Reject anything that doesn't conform.
- **Sanitize before storage.** Strip or escape HTML, SQL, and other injection vectors before writing to the database. Use parameterized queries — never concatenate user input into SQL strings.
- **Never trust the client for authorization.** The client can send any user ID, role, or permission claim. Always verify identity and permissions server-side using the authenticated session from Supabase Auth.
- **Secure authentication flows.** Use Supabase Auth for all authentication. Enforce email verification. Use secure, HTTP-only cookies for session management. Support multi-factor authentication where appropriate.
- **Middleware for protection.** Use Next.js middleware to protect routes that require authentication. Redirect unauthenticated users before the page even renders.

---

## 5. Code Quality Rules

Type safety and modularity are not optional. They reduce bugs, simplify refactors, and make the codebase navigable for new contributors.

- **Strict TypeScript.** Enable `strict: true` in `tsconfig.json`. This means `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, and all related flags are on. No exceptions.
- **No `any` or `unknown` as a shortcut.** Every variable, parameter, return value, and prop must have a proper type. If a type is complex, define an interface or type alias. If you're reaching for `any`, you're doing it wrong.
- **Modular architecture.** Organize code into clear layers:
  - `components/` — Reusable UI components.
  - `services/` or `lib/` — Business logic, API calls, data fetching.
  - `types/` — Shared TypeScript interfaces and type definitions.
  - `config/` — Application configuration and constants.
- **One component per file.** Each file should export a single component, hook, utility, or type. If a file is doing two things, split it.
- **Reusable components.** If the same UI pattern or logic appears in more than one place, extract it into a shared component or utility. Copy-pasting is a bug waiting to happen.
- **Clean naming.**
  - Components: `PascalCase` (`EmployeeCard`, `LeaveRequestForm`).
  - Functions and variables: `camelCase` (`getEmployeeById`, `isActive`).
  - Types and interfaces: `PascalCase` (`Employee`, `LeaveRequest`).
  - Files: Match the export name — `EmployeeCard.tsx`, `getEmployeeById.ts`.
  - Constants: `UPPER_SNAKE_CASE` (`MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE`).
- **Separation of concerns.** Components render UI. Services fetch data. Hooks manage state. Types define shapes. Don't mix these responsibilities.

---

## 6. Public Repository Guidelines

This repository is public. Every file, commit message, and folder name is visible to the world. Treat it like a portfolio piece.

- **Production-quality code only.** Every committed line of code should be something you'd confidently show in a code review. No rough drafts, no "I'll fix it later."
- **Clean folder structure.** The directory layout should be intuitive. A new developer should be able to find what they're looking for without asking.
- **Documentation stays current.** If a feature changes, the relevant documentation updates in the same commit. Stale docs are worse than no docs — they actively mislead.
- **No placeholder code.** No `TODO` hacks, `FIXME` workarounds, or commented-out blocks. If code isn't ready, it doesn't get committed. If a feature is incomplete, use a feature branch — don't litter `main`.
- **Every file has a purpose.** If a file doesn't contribute to the application, delete it. Empty files, unused imports, orphaned components — they all go.
- **Engineering competence at a glance.** Someone browsing this repo should immediately see: clear structure, consistent patterns, meaningful commit history, and professional documentation. First impressions matter.

---

## 7. Performance Rules

A slow application is a broken application. Performance isn't a phase — it's a consideration in every feature, query, and component.

### Data Loading
- **Paginate everything.** Any list or table that could grow beyond a few dozen items must be paginated. Use cursor-based pagination for Supabase queries when possible. Never load unbounded result sets.
- **Optimize PostgreSQL queries.** Use proper indexes. Avoid `SELECT *` — fetch only the columns you need. Use `EXPLAIN ANALYZE` to verify query plans for any query that touches large tables.

### Frontend Performance
- **Bundle size matters.** Use dynamic imports (`next/dynamic`) for heavy components that aren't needed on initial load. Audit the bundle regularly with `@next/bundle-analyzer`.
- **Loading states everywhere.** Every data-fetching component must have a loading state. Use skeleton screens for layouts that maintain spatial stability. Never show a blank screen while data loads.
- **Lazy load media.** Images below the fold use `loading="lazy"`. Videos load on interaction, not on page load. Use `next/image` for automatic optimization, responsive sizing, and format selection.
- **Responsive images.** Serve appropriately sized images for the viewport. Use `srcSet` and `sizes` attributes. Prefer modern formats (WebP, AVIF) with fallbacks.

### Infrastructure
- **Caching strategy.** Cache API responses where appropriate. Use `stale-while-revalidate` patterns for data that doesn't need to be real-time. Define clear invalidation rules — cached data must never show stale information after a write operation.
- **CDN for static assets.** Serve images, fonts, and other static files through a CDN. Vercel handles this automatically for Next.js assets, but verify that custom static files are also cached.
- **File uploads.** Use Supabase Storage for file uploads. Validate file types and sizes on both client and server. Compress images before storage when possible. Set sensible limits (e.g., 5MB for profile photos, 25MB for documents).

### Monitoring
- **Measure what matters.** Track Core Web Vitals (LCP, FID, CLS) in production. If a metric degrades after a deploy, investigate and fix it before moving on to new features.
