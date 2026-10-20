"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

export default function BlogSearch({ initialSearch }: { initialSearch: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialSearch);
  const isFirstRun = useRef(true);

  // Debounced, same approach as the other list toolbars.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const term = value.trim();
      router.push(term ? `${pathname}?q=${encodeURIComponent(term)}` : pathname);
    }, 400);
    return () => clearTimeout(timeout);
  }, [value, pathname, router]);

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search posts by title..."
          aria-label="Search posts by title"
          className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
        />
      </div>
    </div>
  );
}
