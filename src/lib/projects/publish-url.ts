/** Domínio base de publish (ex: studio.x09.com.br). Subdomínios: {slug}.studio.x09.com.br */
export function getPublishBaseDomain(): string {
  const fromEnv =
    (typeof process !== "undefined" &&
      (process.env.STUDIO_PUBLISH_DOMAIN ||
        process.env.NEXT_PUBLIC_PUBLISH_DOMAIN)) ||
    "studio.x09.com.br";
  return fromEnv.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
}

export function buildProjectSubdomainHost(slug: string): string {
  return `${slug}.${getPublishBaseDomain()}`;
}

export function buildProjectSubdomainUrl(slug: string): string {
  return `https://${buildProjectSubdomainHost(slug)}`;
}

/** Extrai slug de host `{slug}.studio.x09.com.br`. */
export function extractPublishSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const base = getPublishBaseDomain().toLowerCase();
  if (!hostname || hostname === base) return null;

  const suffix = `.${base}`;
  if (!hostname.endsWith(suffix)) return null;

  const slug = hostname.slice(0, -suffix.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return slug;
}
