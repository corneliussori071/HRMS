import MainContent from "@/components/layout/MainContent";
import Skeleton from "@/components/ui/Skeleton";

export default function PTOPage() {
  return (
    <MainContent
      title="Paid Time Off"
      description="View and manage your PTO balance and history."
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Available PTO</p>
          <Skeleton className="mt-2 h-8 w-20" />
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Used This Year</p>
          <Skeleton className="mt-2 h-8 w-20" />
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Pending Requests</p>
          <Skeleton className="mt-2 h-8 w-20" />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Date Range</th>
              <th className="px-4 py-3 font-medium text-muted">Days</th>
              <th className="px-4 py-3 font-medium text-muted">Type</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-5 w-36" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-8" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainContent>
  );
}
