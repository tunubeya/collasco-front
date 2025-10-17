export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-1/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-1/4 animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border bg-background p-4 animate-pulse"
          >
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/3 rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
