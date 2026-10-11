"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Progress from "./Progress";

export default function RunningView({ id, handle }) {
  const router = useRouter();
  const [error, setError] = useState(null);
  const onDone = useCallback(() => router.refresh(), [router]);
  const onFail = useCallback((m) => setError(m), []);
  if (error)
    return (
      <div className="stack">
        <h2>We couldn't build this report</h2>
        <p>{error}</p>
        <div><a className="btn btn--primary" href="/">Try again</a></div>
      </div>
    );
  return <Progress id={id} handle={handle} onDone={onDone} onFail={onFail} />;
}
