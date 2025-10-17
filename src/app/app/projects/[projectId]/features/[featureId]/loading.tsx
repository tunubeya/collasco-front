export default function FeatureDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border bg-background p-4">
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted/70" />
      </div>

      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border bg-background p-4"
        >
          <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((__, innerIdx) => (
              <div
                key={innerIdx}
                className="h-4 w-full animate-pulse rounded bg-muted/80"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
