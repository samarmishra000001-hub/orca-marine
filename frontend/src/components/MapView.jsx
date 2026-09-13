import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import LayerPanel from './LayerPanel';

// Official India boundary GeoJSON sources (includes complete J&K, Ladakh, Lakshadweep, A&N Islands)
const INDIA_COMPOSITE_URL = 'https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson';
const INDIA_STATES_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';

const BASEMAP_STYLES = {
  voyager: {
    label: '🌊 Nautical Blue Ocean',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
  },
  dark: {
    label: '🌙 Dark Radar Chart',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  },
  positron: {
    label: '🗺️ Minimal Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  }
};

// Full India view bounds: includes Aksai Chin (north), Lakshadweep (west/south), Andaman (east/south)
const INDIA_BOUNDS = [[67.0, 5.5], [97.5, 37.5]];

export default function MapView({ layers }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [visibleLayers, setVisibleLayers] = useState(new Set());
  const [activeBasemap, setActiveBasemap] = useState('voyager');
  const syncLayersRef = useRef(null);
  const indiaLayersAdded = useRef(false);

  // Add official India boundary & state layers on the map
  const addIndiaOverlay = useCallback((map) => {
    if (indiaLayersAdded.current) return;
    indiaLayersAdded.current = true;

    // 1. National Boundary (outer outline, thick, official saffron-orange)
    if (!map.getSource('india-boundary')) {
      map.addSource('india-boundary', {
        type: 'geojson',
        data: INDIA_COMPOSITE_URL
      });

      // Filled highlight of Indian territory (very subtle tint)
      map.addLayer({
        id: 'india-territory-fill',
        type: 'fill',
        source: 'india-boundary',
        paint: {
          'fill-color': '#FF9933',
          'fill-opacity': 0.04
        }
      });

      // National boundary line (thick, official saffron)
      map.addLayer({
        id: 'india-boundary-line',
        type: 'line',
        source: 'india-boundary',
        paint: {
          'line-color': '#1a1a2e',
          'line-width': 2.5,
          'line-opacity': 0.85
        }
      });
    }

    // 2. State & UT internal boundaries (thin gray lines like the reference map)
    if (!map.getSource('india-states')) {
      map.addSource('india-states', {
        type: 'geojson',
        data: INDIA_STATES_URL
      });

      // State boundary lines (thin, dark gray)
      map.addLayer({
        id: 'india-states-line',
        type: 'line',
        source: 'india-states',
        paint: {
          'line-color': '#4a4a4a',
          'line-width': 1.0,
          'line-opacity': 0.6
        }
      });

      // State name labels
      map.addLayer({
        id: 'india-states-label',
        type: 'symbol',
        source: 'india-states',
        layout: {
          'text-field': ['get', 'NAME_1'],
          'text-size': 9,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-anchor': 'center',
          'text-max-width': 6,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'visibility': 'visible'
        },
        paint: {
          'text-color': '#555555',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
          'text-opacity': 0.7
        },
        minzoom: 4.5
      });
    }

    // 3. Add Lakshadweep marker annotation
    if (!map.getSource('lakshadweep-label')) {
      map.addSource('lakshadweep-label', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [72.64, 10.57] },
              properties: { name: 'Lakshadweep\n(India)' }
            }
          ]
        }
      });
      map.addLayer({
        id: 'lakshadweep-label',
        type: 'symbol',
        source: 'lakshadweep-label',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#0369a1',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.2
        },
        minzoom: 4
      });
    }

    // 4. Add Andaman & Nicobar marker annotation
    if (!map.getSource('andaman-label')) {
      map.addSource('andaman-label', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [92.72, 11.74] },
              properties: { name: 'Andaman &\nNicobar Islands\n(India)' }
            }
          ]
        }
      });
      map.addLayer({
        id: 'andaman-label',
        type: 'symbol',
        source: 'andaman-label',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#0369a1',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.2
        },
        minzoom: 4
      });
    }

    // 5. "INDIA" country title label (top center on map)
    if (!map.getSource('india-title-label')) {
      map.addSource('india-title-label', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [79.0, 23.5] },
              properties: { name: 'INDIA' }
            }
          ]
        }
      });
      map.addLayer({
        id: 'india-title-label',
        type: 'symbol',
        source: 'india-title-label',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 16,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
          'text-letter-spacing': 0.3
        },
        paint: {
          'text-color': '#1a1a2e',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        },
        minzoom: 3,
        maxzoom: 6
      });
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current) return;
    if (!mapContainer.current) return;

    if (typeof maplibregl.supported === 'function' && !maplibregl.supported()) {
      console.warn("MapLibre WebGL not supported in this client environment.");
      return;
    }

    let map = null;
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: BASEMAP_STYLES.voyager.url,
        center: [78.9629, 20.5937],
        zoom: 4.2,
        maxBounds: [[60, 0], [100, 40]],
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        mapRef.current = map;
        map.resize();

        // Add official India overlay on initial load
        addIndiaOverlay(map);

        if (syncLayersRef.current) syncLayersRef.current();
      });
    } catch (e) {
      console.warn("MapLibre initialization exception:", e);
      return;
    }

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && mapContainer.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      resizeObserver.observe(mapContainer.current);
    }

    const handleWindowResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    const t1 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 100);
    const t2 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 400);
    const t3 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (map) {
        try { map.remove(); } catch (e) { /* ignore */ }
      }
      mapRef.current = null;
      indiaLayersAdded.current = false;
    };
  }, [addIndiaOverlay]);

  // Sync ORCA data layers & Auto-fly to queried region
  useEffect(() => {
    const map = mapRef.current;

    const syncLayers = () => {
      if (!map || !map.isStyleLoaded()) return;

      const currentIds = layers.map(l => l.id);
      const style = map.getStyle();
      if (!style) return;

      const existingSources = style.sources || {};

      // Remove old ORCA layers not in current props
      Object.keys(existingSources).forEach(sourceId => {
        if (sourceId.startsWith('orca-') && !currentIds.includes(sourceId.replace('orca-', ''))) {
          if (map.getLayer(sourceId)) map.removeLayer(sourceId);
          map.removeSource(sourceId);
        }
      });

      main
      // --- OFFICIAL BOUNDARY OVERLAY INJECTION ---
      // This ensures the official Indian boundary (including Aksai Chin) is 
      // dynamically rendered over the default OSM de-facto boundaries.
      if (!map.getSource('india-official-boundary')) {
        map.addSource('india-official-boundary', {
          type: 'geojson',
          data: '/data/india_political_boundary.geojson'
        });
        
        map.addLayer({
          id: 'india-official-fill',
          type: 'fill',
          source: 'india-official-boundary',
          paint: {
            'fill-color': '#00d4ff',
            'fill-opacity': 0.03
          }
        });

        map.addLayer({
          id: 'india-official-line',
          type: 'line',
          source: 'india-official-boundary',
          paint: {
            'line-color': '#e74c3c', // Distinct red to differentiate from default OSM borders
            'line-width': 2.5,
            'line-dasharray': [3, 2] // Dashed visual indicator for the overlay
          }
        });

        // Aksai Chin Explicit Label Marker
        map.addSource('aksai-chin-label', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [79.2, 35.2] },
              properties: { name: 'Aksai Chin (India)' }
            }]
          }
        });
        
        map.addLayer({
          id: 'aksai-chin-text',
          type: 'symbol',
          source: 'aksai-chin-label',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 13,
            'text-offset': [0, 1.5]
          },
          paint: {
            'text-color': '#e74c3c',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
          }
        });
      }
      // --- END OFFICIAL BOUNDARY ---

      // 2. Add or update new layer
      // Add or update ORCA data layers main
      layers.forEach(layer => {
        const sourceId = `orca-${layer.id}`;
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: layer.data
          });
        } else {
          map.getSource(sourceId).setData(layer.data);
        }

        if (!map.getLayer(sourceId)) {
          const paint = {};

          if (layer.type === 'fill') {
            paint['fill-color'] = layer.style?.color || '#00d4ff';
            paint['fill-opacity'] = layer.style?.opacity !== undefined ? layer.style.opacity : 0.5;
            paint['fill-outline-color'] = '#ffffff';
          } else if (layer.type === 'line') {
            paint['line-color'] = layer.style?.color || '#00d4ff';
            paint['line-width'] = layer.style?.width || 3;
            paint['line-opacity'] = layer.style?.opacity !== undefined ? layer.style.opacity : 0.9;
          } else if (layer.type === 'circle') {
            paint['circle-color'] = layer.style?.color || '#FF6B35';
            paint['circle-radius'] = layer.style?.width || 6;
            paint['circle-opacity'] = layer.style?.opacity !== undefined ? layer.style.opacity : 0.85;
            paint['circle-stroke-width'] = 1.5;
            paint['circle-stroke-color'] = '#ffffff';
          }

          map.addLayer({
            id: sourceId,
            type: layer.type,
            source: sourceId,
            paint: paint,
            layout: {
              visibility: visibleLayers.has(layer.id) ? 'visible' : 'none'
            }
          });

          // Interactive popup
          map.on('click', sourceId, (e) => {
            if (!e.features || !e.features.length) return;
            const coordinates = e.lngLat;
            const properties = e.features[0].properties;

            let html = '<div style="font-size:12.5px; font-family: sans-serif; line-height:1.5;">';
            html += '<div style="font-weight: bold; margin-bottom: 6px; color: #00d4ff; border-bottom: 1px solid #334155; padding-bottom: 3px;">📍 ' + (layer.label || 'Feature Details') + '</div>';
            for (const [key, value] of Object.entries(properties)) {
              if (key !== 'coordinates' && key !== 'geometry') {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                html += `<div><strong style="color:#94a3b8">${formattedKey}:</strong> ${value}</div>`;
              }
            }
            html += '</div>';

            new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
              .setLngLat(coordinates)
              .setHTML(html)
              .addTo(map);
          });

          map.on('mouseenter', sourceId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', sourceId, () => {
            map.getCanvas().style.cursor = '';
          });
        } else {
          map.setLayoutProperty(
            sourceId,
            'visibility',
            visibleLayers.has(layer.id) ? 'visible' : 'none'
          );
        }
      });

      // Auto-fit camera to newly returned specific layers
      if (layers.length > 0) {
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        let found = false;

        const scanCoordinates = (coords) => {
          if (!Array.isArray(coords)) return;
          if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const [lng, lat] = coords;
            if (lng >= 64 && lng <= 98 && lat >= 4 && lat <= 37) {
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              found = true;
            }
          } else {
            coords.forEach(scanCoordinates);
          }
        };

        const targetLayers = layers.filter(l => !['imbl-layer', 'imbl-route-layer', 'mpa-layer'].includes(l.id));
        const layersToFit = targetLayers.length ? targetLayers : layers;

        layersToFit.forEach(l => {
          const features = l.data?.features || [];
          features.forEach(f => {
            if (f.geometry?.coordinates) {
              scanCoordinates(f.geometry.coordinates);
            }
          });
        });

        if (found) {
          map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
            padding: { top: 70, bottom: 70, left: 70, right: 70 },
            maxZoom: 9.5,
            duration: 1500
          });
        }
      }
    };

    syncLayersRef.current = syncLayers;

    if (map && map.isStyleLoaded()) {
      syncLayers();
    } else if (map) {
      map.on('load', syncLayers);
    }
  }, [layers, visibleLayers]);

  // Populate visible layers when new layers arrive
  useEffect(() => {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      layers.forEach(l => {
        if (!next.has(l.id)) next.add(l.id);
      });
      return next;
    });
  }, [layers]);

  const toggleLayer = useCallback((id) => {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const switchBasemap = (styleKey) => {
    const map = mapRef.current;
    if (!map || styleKey === activeBasemap) return;
    try {
      setActiveBasemap(styleKey);
      indiaLayersAdded.current = false;
      map.setStyle(BASEMAP_STYLES[styleKey].url);
      map.once('style.load', () => {
        map.resize();
        addIndiaOverlay(map);
        if (syncLayersRef.current) syncLayersRef.current();
      });
    } catch (err) {
      console.warn("Basemap switch error:", err);
    }
  };

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map-wrapper" />

      {/* Basemap Style Switcher Control */}
      <div className="basemap-selector">
        {Object.entries(BASEMAP_STYLES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            className={`basemap-btn ${activeBasemap === key ? 'active' : ''}`}
            onClick={() => switchBasemap(key)}
            title={item.label}
          >
            {item.label.split(' ')[0]} {item.label.split(' ')[1]}
          </button>
        ))}
      </div>

      {layers.length > 0 && (
        <LayerPanel
          layers={layers}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
        />
      )}
    </div>
  );
}
