export function isMissingRelationError(error: {
  code?: string;
  message?: string;
}): boolean {
  if (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204"
  ) {
    return true;
  }
  return /relation ["'].+["'] does not exist|column .+ does not exist|could not find the .+ column .+ schema cache/i.test(
    error.message ?? "",
  );
}

export const SCHEMA_PENDING_MESSAGE =
  "A biblioteca ainda não está no banco. Aplique as migrations de assets quando revisá-las — nada foi executado automaticamente.";
