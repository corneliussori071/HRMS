import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
      <p className="mt-2 text-sm text-muted">
        You do not have permission to view this page.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
