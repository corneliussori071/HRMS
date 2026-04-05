import MainContent from "@/components/layout/MainContent";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

export default function OvertimePage() {
  return (
    <MainContent
      title="Overtime"
      description="Track and submit overtime hours."
      actions={<Button size="sm">Log Overtime</Button>}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">This Month</p>
          <Skeleton className="mt-2 h-8 w-20" />
        </div>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted">Pending Approval</p>
          <Skeleton className="mt-2 h-8 w-20" />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Date</th>
              <th className="px-4 py-3 font-medium text-muted">Hours</th>
              <th className="px-4 py-3 font-medium text-muted">Reason</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-12" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainContent>
  );
}
