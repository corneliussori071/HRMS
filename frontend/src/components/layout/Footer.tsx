import { APP_NAME } from "@/config/env";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <p className="text-xs text-muted">
          {currentYear} {APP_NAME}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <a href="/privacy" className="text-xs text-muted hover:text-foreground">
            Privacy Policy
          </a>
          <a href="/terms" className="text-xs text-muted hover:text-foreground">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
