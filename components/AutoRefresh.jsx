"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the server-rendered report every few seconds (while the audit or deep report is running). */
export default function AutoRefresh({ every = 4000, stopAfter = 6 * 60_000 }) {
  const router = useRouter();
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      if (Date.now() - start > stopAfter) return clearInterval(t);
      router.refresh();
    }, every);
    return () => clearInterval(t);
  }, [router, every, stopAfter]);
  return null;
}
