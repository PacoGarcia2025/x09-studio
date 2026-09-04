"use client";

import { ClientRouteError } from "@/components/ClientRouteError";

export default function AssetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ClientRouteError error={error} reset={reset} />;
}
