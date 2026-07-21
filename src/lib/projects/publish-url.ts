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

/** URL por path — funciona sem SSL wildcard (*.studio.x09.com.br). */
export function buildProjectPathUrl(slug: string): string {
  return `https://${getPublishBaseDomain()}/sites/${slug}`;
}

/** true quando VPS tem DNS wildcard + certificado *.studio.x09.com.br. */
export function isSubdomainPublishReady(): boolean {
  const flag =
    (typeof process !== "undefined" &&
      (process.env.STUDIO_PUBLISH_SUBDOMAIN_SSL ||
        process.env.NEXT_PUBLIC_PUBLISH_SUBDOMAIN_SSL)) ||
    "";
  return flag === "true" || flag === "1";
}

/** Link que o usuário deve copiar/compartilhar agora. */
export function resolvePublicShareUrl(
  slug: string,
  stored?: string | null,
): string {
  if (isSubdomainPublishReady()) {
    return resolveProjectPublishUrl(slug, stored);
  }
  return buildProjectPathUrl(slug);
}

/** Converte URL legada (/sites/{slug}) para subdomínio canônico. */
export function resolveProjectPublishUrl(
  slug: string,
  stored?: string | null,
): string {
  const canonical = buildProjectSubdomainUrl(slug);
  const raw = stored?.trim();
  if (!raw) return canonical;

  try {
    const parsed = new URL(raw);
    const legacyPath = `/sites/${slug}`;
    if (
      parsed.pathname === legacyPath ||
      parsed.pathname === `${legacyPath}/`
    ) {
      return canonical;
    }
    if (parsed.hostname.toLowerCase() === buildProjectSubdomainHost(slug)) {
      return raw;
    }
  } catch {
    // ignore
  }

  return canonical;
}

/** true se published_url ainda usa /sites/{slug}. */
export function isLegacyPublishedUrl(slug: string, stored?: string | null): boolean {
  const raw = stored?.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const legacyPath = `/sites/${slug}`;
    return (
      parsed.pathname === legacyPath || parsed.pathname === `${legacyPath}/`
    );
  } catch {
    return false;
  }
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
