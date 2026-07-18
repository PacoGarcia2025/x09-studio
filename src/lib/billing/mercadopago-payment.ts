const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveCreditPurchaseIdentity(resource: {
  external_reference?: unknown;
  metadata?: unknown;
}): { userId: string; packageCode: string } | null {
  const externalReference = String(resource.external_reference ?? "");
  const metadata =
    resource.metadata && typeof resource.metadata === "object"
      ? (resource.metadata as Record<string, unknown>)
      : {};
  const referenceParts = externalReference.split(":");

  const userId = String(
    metadata.user_id ??
      (referenceParts[0] === "credits"
        ? referenceParts[1]
        : referenceParts[0]) ??
      "",
  );
  const packageCode = String(
    metadata.package_code ??
      (referenceParts[0] === "credits"
        ? referenceParts[2]
        : referenceParts[1]) ??
      "",
  );

  if (!UUID_PATTERN.test(userId)) return null;
  if (!/^[a-z0-9_-]{1,40}$/i.test(packageCode)) return null;

  return { userId, packageCode };
}

export function isApprovedPayment(resource: {
  status?: unknown;
}): boolean {
  return String(resource.status ?? "").toLowerCase() === "approved";
}
