type OsmMapProps = {
  lat?: number;
  lng?: number;
  zoom?: number;
  label?: string;
  className?: string;
};

/** Mapa OpenStreetMap via embed — zero API key, funciona em Sandpack. */
export function OsmMap({
  lat = -23.5505,
  lng = -46.6333,
  zoom = 14,
  label = "Localização do imóvel",
  className = "",
}: OsmMapProps) {
  const delta = 0.02 / (zoom / 12);
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ring-stone-200 ${className}`}>
      <iframe
        title={label}
        src={src}
        className="h-64 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
