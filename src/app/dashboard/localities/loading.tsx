function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="h-3 w-20 animate-pulse rounded bg-line" />
      <div className="mt-3 h-7 w-12 animate-pulse rounded bg-line" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-line" />
    </div>
  );
}

export default function LocalitiesLoading() {
  return (
    <>
      <header className="flex items-start justify-between gap-4 px-4 py-5 sm:px-6 md:px-8 md:py-7">
        <div>
          <div className="h-7 w-28 animate-pulse rounded bg-line" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-line" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-line" />
      </header>

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          <div className="h-24 animate-pulse rounded-2xl border border-line bg-white" />

          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0"
              >
                <div className="h-12 w-16 shrink-0 animate-pulse rounded-lg bg-line" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
                  <div className="h-3 w-1/5 animate-pulse rounded bg-line" />
                </div>
                <div className="h-3 w-16 animate-pulse rounded bg-line" />
                <div className="h-3 w-16 animate-pulse rounded bg-line" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
