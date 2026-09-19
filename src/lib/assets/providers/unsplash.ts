import type { AssetSearchProvider, AssetSearchQuery, AssetSearchResult } from "./types";

export class UnsplashProvider implements AssetSearchProvider {
  id = "unsplash";

  async search(query: AssetSearchQuery): Promise<AssetSearchResult[]> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn("[UnsplashProvider] UNSPLASH_ACCESS_KEY não configurada. Ignorando busca.");
      return [];
    }

    const searchTerm = [query.subject, query.style].filter(Boolean).join(" ");
    
    if (!searchTerm) {
      return [];
    }

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", searchTerm);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("content_filter", "high"); // evitar conteúdo impróprio

    if (query.orientation && ["landscape", "portrait", "squarish"].includes(query.orientation)) {
      url.searchParams.set("orientation", query.orientation);
    }

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "Accept-Version": "v1",
          Authorization: `Client-ID ${accessKey}`,
        },
      });

      if (!res.ok) {
        console.error(`[UnsplashProvider] Erro na API: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map(this.normalize);
    } catch (error) {
      console.error("[UnsplashProvider] Falha ao comunicar com a API:", error);
      return [];
    }
  }

  private normalize(photo: any): AssetSearchResult {
    const meta: Record<string, unknown> = {
      width: photo.width,
      height: photo.height,
      color: photo.color,
      blur_hash: photo.blur_hash,
      photo_page_url: photo.links?.html,
      download_location: photo.links?.download_location,
      photographer_username: photo.user?.username,
      photographer_profile_url: photo.user?.links?.html,
    };

    return {
      provider: "unsplash",
      provider_asset_id: photo.id,
      source_url: photo.links?.html || null,
      asset_url: photo.urls?.raw || photo.urls?.full || photo.urls?.regular || null,
      title: photo.alt_description || null,
      description: photo.description || null,
      author: photo.user?.name || null,
      license: "Unsplash License", // Unsplash photos are free to use
      dimensions: photo.width && photo.height ? `${photo.width}x${photo.height}` : null,
      format: "jpeg", // Unsplash API returns JPEGs by default unless specified via fm parameter on raw url
      meta,
    };
  }
}
