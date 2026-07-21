import { useEffect, useRef } from "react";
import type { Property } from "../lib/properties";
import { formatPriceShort } from "../lib/properties";
import { propertyHasCoords, type LatLngBounds } from "../lib/map-utils";

type PropertyMapProps = {
  properties: Property[];
  highlightedId?: string | null;
  onHighlight?: (id: string | null) => void;
  onBoundsChange?: (bounds: LatLngBounds, visibleIds: string[]) => void;
  onSelect?: (id: string) => void;
  className?: string;
};

const CARTO_POSITRON =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

function pricePinHtml(priceLabel: string, isHot: boolean): string {
  return `<div class="x09-map-pin" style="
    background:${isHot ? "#D4AF37" : "#1c1917"};
    color:white;
    border:2px solid ${isHot ? "#fff" : "#D4AF37"};
    border-radius:9999px;
    padding:5px 10px;
    font-size:11px;
    font-weight:700;
    letter-spacing:-0.02em;
    white-space:nowrap;
    box-shadow:0 6px 18px rgba(0,0,0,.28);
    transform:scale(${isHot ? 1.14 : 1});
    transition:transform .15s ease;
  ">${priceLabel}</div>`;
}

/** Mapa Leaflet + CartoDB Positron — pins com preço + marker clustering. */
export function PropertyMap({
  properties,
  highlightedId,
  onHighlight,
  onBoundsChange,
  onSelect,
  className = "",
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const clusterRef = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      import("leaflet"),
      import("leaflet.markercluster"),
    ]).then(([L]) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
      });

      L.tileLayer(CARTO_POSITRON, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      const withCoords = properties.filter(propertyHasCoords);
      if (withCoords.length > 0) {
        const group = L.featureGroup(
          withCoords.map((p) => L.marker([p.lat, p.lng])),
        );
        map.fitBounds(group.getBounds().pad(0.15));
      } else {
        map.setView([-23.5505, -46.6333], 12);
      }

      mapRef.current = map;

      const emitBounds = () => {
        const b = map.getBounds();
        const bounds: LatLngBounds = {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        };
        const visibleIds = properties
          .filter(propertyHasCoords)
          .filter(
            (p) =>
              p.lat >= bounds.south &&
              p.lat <= bounds.north &&
              p.lng >= bounds.west &&
              p.lng <= bounds.east,
          )
          .map((p) => p.id);
        onBoundsChange?.(bounds, visibleIds);
      };

      map.on("moveend", emitBounds);
      emitBounds();
    });

    return () => {
      cancelled = true;
      clusterRef.current?.clearLayers();
      mapRef.current?.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, [properties, onBoundsChange]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current.clearLayers();
    }

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 56,
      spiderfyOnMaxZoom: true,
      animate: true,
    });

    for (const p of properties) {
      if (!propertyHasCoords(p)) continue;

      const isHot = p.id === highlightedId;
      const icon = L.divIcon({
        className: "",
        html: pricePinHtml(formatPriceShort(p.price), isHot),
        iconSize: [88, 32],
        iconAnchor: [44, 16],
      });

      const marker = L.marker([p.lat, p.lng], { icon });
      marker.on("mouseover", () => onHighlight?.(p.id));
      marker.on("mouseout", () => onHighlight?.(null));
      marker.on("click", () => onSelect?.(p.id));
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [properties, highlightedId, onHighlight, onSelect]);

  return (
    <div
      ref={containerRef}
      className={`h-full min-h-[320px] w-full rounded-2xl ring-1 ring-stone-200 ${className}`}
      aria-label="Mapa de imóveis"
    />
  );
}
