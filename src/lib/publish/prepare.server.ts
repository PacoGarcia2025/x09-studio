import "server-only";

import {
  fileExists,
  listProjectTree,
  readProjectFile,
  writeProjectFile,
  type FileTreeNode,
} from "@/lib/projects/fs.server";
import {
  buildPublishIndexHtml,
  buildRobotsTxt,
  buildSitemapXml,
  extractListingsJsonLd,
  inferDescriptionFromBrief,
  optimizeUnsplashUrlsInSource,
} from "@/lib/publish/seo-meta";
import { fixBrokenImagesInSource } from "@/lib/pipeline/source-images";
import { syncPublishedSeoPages } from "@/lib/publish/seo-pages.server";
import { isImobiliaria360 } from "@/lib/skills/detect";
import {
  buildProjectSubdomainUrl,
  resolvePublicShareUrl,
  isSubdomainPublishReady,
} from "@/lib/projects/publish-url";

function flattenFiles(nodes: FileTreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.type === "directory" && node.children) {
      flattenFiles(node.children, out);
    } else if (node.type === "file") {
      out.push(node.path);
    }
  }
  return out;
}

const TEXT_OPTIMIZE_EXT = /\.(tsx?|jsx?|css|html|json)$/i;

/**
 * Prepara projeto para publish: SEO estático, sitemap, robots, WebP Unsplash, JSON-LD.
 * Zero SaaS — roda no VPS com arquivos locais.
 */
export async function prepareProjectForPublish(input: {
  projectId: string;
  projectName: string;
  slug: string;
  briefPrompt?: string | null;
  publishedUrl?: string | null;
}): Promise<{ log: string[] }> {
  const log: string[] = [];
  const siteUrl = input.publishedUrl?.trim()
    ? input.publishedUrl
    : isSubdomainPublishReady()
      ? buildProjectSubdomainUrl(input.slug)
      : resolvePublicShareUrl(input.slug, null);

  const description = inferDescriptionFromBrief(
    input.briefPrompt,
    input.projectName,
  );

  await writeProjectFile(
    input.projectId,
    "index.html",
    buildPublishIndexHtml({
      siteName: input.projectName,
      description,
      url: siteUrl,
    }),
  );
  log.push("index.html SEO (OG + Twitter + canonical)");

  await writeProjectFile(
    input.projectId,
    "public/robots.txt",
    buildRobotsTxt(siteUrl),
  );
  log.push("public/robots.txt");

  const sitemapPaths = isImobiliaria360(input.briefPrompt ?? "")
    ? ["/", "/imoveis", "/login"]
    : ["/", "/login"];

  if (await fileExists(input.projectId, "src/lib/properties.ts")) {
    const props = await readProjectFile(input.projectId, "src/lib/properties.ts");
    const idRe = /id:\s*["']([^"']+)["']/g;
    for (const m of props.matchAll(idRe)) {
      sitemapPaths.push(`/imovel/${m[1]}`);
    }
  }

  await writeProjectFile(
    input.projectId,
    "public/sitemap.xml",
    buildSitemapXml(siteUrl, sitemapPaths),
  );
  log.push("public/sitemap.xml");

  if (await fileExists(input.projectId, "src/lib/properties.ts")) {
    const props = await readProjectFile(input.projectId, "src/lib/properties.ts");
    const jsonLd = extractListingsJsonLd(
      props,
      input.projectName,
      siteUrl,
    );
    if (jsonLd) {
      await writeProjectFile(
        input.projectId,
        "public/schema-listings.json",
        jsonLd,
      );
      log.push("public/schema-listings.json (RealEstateListing)");
    }
  }

  const tree = await listProjectTree(input.projectId);
  const paths = flattenFiles(tree).filter((p) => TEXT_OPTIMIZE_EXT.test(p));
  let optimized = 0;
  for (const rel of paths) {
    try {
      const raw = await readProjectFile(input.projectId, rel);
      const isHtml = /\.html$/i.test(rel);
      let next = isHtml ? raw : fixBrokenImagesInSource(raw);
      next = optimizeUnsplashUrlsInSource(next);
      if (next !== raw) {
        await writeProjectFile(input.projectId, rel, next);
        optimized += 1;
      }
    } catch {
      // skip
    }
  }
  if (optimized > 0) {
    log.push(`Imagens + WebP Unsplash em ${optimized} arquivo(s)`);
  }

  try {
    const count = await syncPublishedSeoPages({
      projectId: input.projectId,
      projectSlug: input.slug,
      projectName: input.projectName,
      siteUrl,
      briefDescription: description,
    });
    log.push(`SEO dinâmico Supabase (${count} rotas)`);
  } catch (syncErr) {
    console.warn("[publish] sync SEO pages skipped", syncErr);
    log.push("SEO dinâmico: migration pending ou Supabase indisponível");
  }

  return { log };
}
