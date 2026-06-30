"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  if (diff > 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(new Date(endsAt), { addSuffix: true });
  }
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AuctionCountdown({
  endsAt,
  className = "",
}: {
  endsAt: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatCountdown(endsAt));

  useEffect(() => {
    setLabel(formatCountdown(endsAt));
    const id = setInterval(() => setLabel(formatCountdown(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className={className} aria-live="polite" suppressHydrationWarning>
      {label}
    </span>
  );
}
