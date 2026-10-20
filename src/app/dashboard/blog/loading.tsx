export default function BlogLoading() {
  return (
    <>
      <header className="flex items-start justify-between gap-4 px-4 py-5 sm:px-6 md:px-8 md:py-7">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-line" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-line" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-line" />
      </header>
      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <div className="h-20 animate-pulse rounded-2xl border border-line bg-white" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="aspect-[16/9] animate-pulse bg-line" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-line" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
