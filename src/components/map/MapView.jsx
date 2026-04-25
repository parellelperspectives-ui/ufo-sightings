import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { capitalizeFirst, decodeHTMLEntities } from '../../utils/formatters';

export default function MapView({
  data,
  center,
  zoom,
  bounds,
  resetMapTrigger,
  focusEvent,
}) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const lightTiles =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  function escapeHTML(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.setView([20, 0], 2, {
      animate: true,
      duration: 1,
    });
  }, [resetMapTrigger]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
      }).setView([20, 0], 2);

      const tileUrl = lightTiles;

      tileLayerRef.current = L.tileLayer(lightTiles, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
        noWrap: true,
        detectRetina: true, // 👈 THIS is the upgrade
      });

      tileLayerRef.current.addTo(mapRef.current);
    }

    if (layerRef.current) {
      layerRef.current.clearLayers();
    } else {
      layerRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 8,
      });
      mapRef.current.addLayer(layerRef.current);
    }

    const shapeIcons = {
      circle: { symbol: '●', color: '#1E90FF' },
      triangle: { symbol: '▲', color: '#4682B4' },
      light: { symbol: '✦', color: '#BF6900' },
      disk: { symbol: '⬤', color: 'darkred' },
      fireball: { symbol: '🔥', color: '#4169E1' },
      oval: { symbol: '◯', color: '#000000' },
      sphere: { symbol: '◉', color: '#000000' },
      cigar: { symbol: '▭', color: '#000000' },
      formation: { symbol: '★', color: '#4682B4' },
      chevron: { symbol: '⌃', color: 'darkred' },
      other: { symbol: '?', color: '#000000' },
    };

    const latLngs = [];

   const getPopupContent = (item) => `
  <div class="min-w-[260px] max-w-[320px] text-sm text-slate-200">
    <div class="mb-3 rounded-xl px-3 py-2" style="background:#0f172a; box-shadow: inset 0 0 0 9999px rgba(0,0,0,0.50);">
      <div class="text-base font-semibold text-white">
        <span>🛸</span>${escapeHTML(capitalizeFirst(item.shape || 'Event'))}
      </div>
      <div class="text-xs text-white/80">
        <span>📍</span>${escapeHTML(
          (item.location || '')
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .join(', ') || 'Unknown'
        )}
      </div>
      <div class="text-xs text-white/80">
        <span>📍</span>${escapeHTML(item.date || 'Unknown')}
      </div>
    </div>

    <div class="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
      <span class="flex items-center gap-2 font-medium text-slate-400">
        <span>⏱</span><span>Duration</span>
      </span>
      <span class="text-slate-100">
        ${escapeHTML(item.duration || 'N/A')}
      </span>

      <span class="flex items-start gap-2 font-medium text-slate-400">
        <span>💬</span><span>Summary</span>
      </span>
      <span class="max-h-32 overflow-y-auto whitespace-normal break-words leading-snug text-slate-100">
        ${escapeHTML(decodeHTMLEntities(item.summary || 'N/A'))}
      </span>
    </div>
  </div>
`;
    data.forEach(d => {
      if (isNaN(d.lat) || isNaN(d.lon)) return;

      latLngs.push([d.lat, d.lon]);

      const s =
        shapeIcons[d.shape?.toLowerCase()] || {
          symbol: '●',
          color: 'darkblue',
        };

      const icon = L.divIcon({
        className: 'custom-icon',
        html: `
          <div style="
            display:flex;
            align-items:center;
            justify-content:center;
            width:28px;
            height:28px;
            border-radius:9999px;
            border:1px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            background:${s.color};
            color:white;
            font-size:14px;
          ">
            ${s.symbol}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([d.lat, d.lon], { icon })
        .bindPopup(getPopupContent(d), {
          className: 'tooltipMap',
          maxWidth: 340,
          autoPan: true,
        })
       .bindTooltip(
          `${capitalizeFirst(d.shape || 'Unknown')} • ${
            (d.location || '')
              .split(',')
              .map(s => s.trim())
              .filter(s => s.length > 0)
              .join(', ') || 'Unknown'
          }`,
          { direction: 'top', opacity: 1 }
        )
      const markerId = d.id ?? `${d.date}-${d.location}`;

      if (focusEvent && markerId === focusEvent) {
        setTimeout(() => marker.openPopup(), 150);
      }

      layerRef.current.addLayer(marker);
    });

    if (focusEvent && center && zoom) {
      mapRef.current.setView(center, zoom, {
        animate: true,
        duration: 1,
      });
    } else if (latLngs.length > 1) {
      const fittedBounds = L.latLngBounds(latLngs);
      mapRef.current.fitBounds(fittedBounds, {
        padding: [40, 40],
        maxZoom: 7,
        animate: true,
        duration: 1,
      });
    } else if (latLngs.length === 1) {
      mapRef.current.setView(latLngs[0], 6, {
        animate: true,
        duration: 1,
      });
    } else {
      mapRef.current.setView([20, 0], 2, {
        animate: true,
        duration: 1,
      });
    }
  }, [data, center, zoom, bounds, focusEvent]);

  return (
    <div className="overflow-hidden border border-slate-200 dark:border-slate-800">
      <div id="map" style={{ height: '400px' }} />
    </div>
  );
}