import MainContent from "@/components/layout/MainContent";
import Skeleton from "@/components/ui/Skeleton";

export default function AttendancePage() {
  return (
    <MainContent
      title="Attendance"
      description="Track and manage employee attendance records."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="date-filter" className="text-sm font-medium text-foreground">
            Date
          </label>
          <input
            id="date-filter"
            type="date"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="department-filter" className="text-sm font-medium text-foreground">
            Department
          </label>
          <select
            id="department-filter"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-3 font-medium text-muted">Employee</th>
              <th className="px-4 py-3 font-medium text-muted">Department</th>
              <th className="px-4 py-3 font-medium text-muted">Check In</th>
              <th className="px-4 py-3 font-medium text-muted">Check Out</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainContent>
  );
}
