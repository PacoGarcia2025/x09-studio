"use client";

import { ClientRouteError } from "@/components/ClientRouteError";

export default function PerfilError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ClientRouteError error={error} reset={reset} />;
}
