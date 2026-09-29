"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

export default function DeleteSuccessToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deletedName = searchParams.get("deleted");

  const [prevDeletedName, setPrevDeletedName] = useState(deletedName);
  const [visible, setVisible] = useState(Boolean(deletedName));

  // Re-show the toast whenever the "deleted" param changes to a new value
  // (adjusting state during render, per React's guidance, rather than in an
  // effect).
  if (deletedName !== prevDeletedName) {
    setPrevDeletedName(deletedName);
    setVisible(Boolean(deletedName));
  }

  useEffect(() => {
    if (!deletedName) return;

    const timeout = setTimeout(() => {
      dismiss();
    }, 3000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedName]);

  function dismiss() {
    setVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("deleted");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  if (!deletedName || !visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 shadow-lg">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
      <p className="text-sm text-ink">
        <span className="font-semibold">{decodeURIComponent(deletedName)}</span> was deleted.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-1 text-muted hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
