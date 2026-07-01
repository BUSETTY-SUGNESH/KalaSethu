'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import CollectorBidsPanel from "./CollectorBidsPanel";

export default function CollectorBidsPage() {
  const router = useRouter();
  const { isArtist, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && isArtist()) {
      router.replace('/dashboard/artist/auctions');
    }
  }, [authLoading, isArtist, router]);

  if (authLoading || isArtist()) {
    return (
      <div className="flex flex-col gap-16">
        <div className="skeleton" style={{ height: 80 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return <CollectorBidsPanel />;
}
