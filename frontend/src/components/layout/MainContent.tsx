import { ReactNode } from "react";

interface MainContentProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function MainContent({ children, title, description, actions }: MainContentProps) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </main>
  );
}
