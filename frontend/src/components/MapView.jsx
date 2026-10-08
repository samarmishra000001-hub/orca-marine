import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

const COASTAL_PRESETS = {
  'chennai': { name: 'Tamil Nadu Shelf · Sector 04', state: 'Tamil Nadu', coords: [80.27, 13.08], pfz: 15, sst: '28.5°C', current: '5 kts', swell: '1.1m', advisory: 'Optimal Catch', vis: '14 NM', temp: '29°C' },
  'kochi': { name: 'Malabar Shelf · Sector 02', state: 'Kerala', coords: [76.26, 9.93], pfz: 22, sst: '29.1°C', current: '3.8 kts', swell: '1.4m', advisory: 'High Tuna Activity', vis: '12 NM', temp: '29.5°C' },
  'mumbai': { name: 'Konkan Basin · Sector 01', state: 'Maharashtra', coords: [72.82, 18.92], pfz: 18, sst: '27.8°C', current: '6.2 kts', swell: '1.8m', advisory: 'Moderate Swell Alert', vis: '10 NM', temp: '28°C' },
  'rameswaram': { name: 'Palk Bay · Sector 06 (IMBL)', state: 'Tamil Nadu', coords: [79.31, 9.29], pfz: 12, sst: '28.9°C', current: '2.4 kts', swell: '0.8m', advisory: 'Buffer Alert Active', vis: '16 NM', temp: '29°C' },
  'kanyakumari': { name: 'Cape Comorin Confluence · Sector 05', state: 'Tamil Nadu', coords: [77.55, 8.08], pfz: 28, sst: '27.4°C', current: '7.1 kts', swell: '2.1m', advisory: 'Deep Pelagic Schools', vis: '15 NM', temp: '27.5°C' },
  'visakhapatnam': { name: 'Andhra Offshore · Sector 07', state: 'Andhra Pradesh', coords: [83.21, 17.68], pfz: 19, sst: '28.2°C', current: '4.5 kts', swell: '1.2m', advisory: 'Optimal Catch', vis: '14 NM', temp: '28.5°C' },
  'goa': { name: 'Goa Coastal Waters · Sector 03', state: 'Goa', coords: [73.82, 15.49], pfz: 14, sst: '28.7°C', current: '3.1 kts', swell: '1.0m', advisory: 'Calm Sea State', vis: '18 NM', temp: '29°C' },
  'porbandar': { name: 'Saurashtra Coast · Sector 08', state: 'Gujarat', coords: [69.60, 21.64], pfz: 26, sst: '26.9°C', current: '5.8 kts', swell: '1.6m', advisory: 'Rich Demersal Zone', vis: '12 NM', temp: '27°C' }
};

export default function MapView({ 
  layers = [], 
  onToggleChat, 
  onLocationSelect,
  onMapClickCoordinates,
  onTriggerZoneQuery,
  activeLocation = 'chennai',
  isMapExpanded = false,
  onToggleExpandMap,
  onToggleFullScreen,
  isFullScreen = false
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const [visibleLayers, setVisibleLayers] = useState(new Set());
  const [searchVal, setSearchVal] = useState('Bay of Bengal · Sector 04');
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [selectedPort, setSelectedPort] = useState('chennai');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ lat: 13.08, lon: 80.27 });
  const [clickedPin, setClickedPin] = useState(null);

  const activePreset = COASTAL_PRESETS[selectedPort] || COASTAL_PRESETS['chennai'];

  // Handle smooth map resize when toggling full map or full screen
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current.resize();
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [isMapExpanded, isFullScreen]);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize MapLibre GL
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: activePreset.coords,
      zoom: 6.8,
      attributionControl: false
    });

    map.on('load', () => {
      mapRef.current = map;
    });

    // Real-time cursor coordinates
    map.on('mousemove', (e) => {
      setCursorCoords({
        lat: parseFloat(e.lngLat.lat.toFixed(4)),
        lon: parseFloat(e.lngLat.lng.toFixed(4))
      });
    });

    // Interactive map click
    map.on('click', (e) => {
      const lat = parseFloat(e.lngLat.lat.toFixed(4));
      const lon = parseFloat(e.lngLat.lng.toFixed(4));
      setClickedPin({ lat, lon });

      if (onMapClickCoordinates) {
        onMapClickCoordinates(lat, lon);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Smoothly Fly to Selected Coastal Port
  const flyToPort = useCallback((portKey) => {
    const preset = COASTAL_PRESETS[portKey];
    if (!preset || !mapRef.current) return;

    setSelectedPort(portKey);
    setSelectedState(preset.state);
    setSearchVal(`${preset.name}`);
    if (onLocationSelect) {
      onLocationSelect(preset);
    }

    mapRef.current.flyTo({
      center: preset.coords,
      zoom: 7.2,
      duration: 1800,
      essential: true
    });
  }, [onLocationSelect]);

  // Handle Search Input
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      const q = searchVal.toLowerCase();
      const matched = Object.keys(COASTAL_PRESETS).find(k => q.includes(k) || COASTAL_PRESETS[k].name.toLowerCase().includes(q));
      if (matched) {
        flyToPort(matched);
      }
    }
  };

  // Zoom controls
  const handleZoom = (delta) => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: 300 });
  };

  // Sync Layers & Zone Filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncLayers = () => {
      if (!map.isStyleLoaded()) return;

      const currentIds = layers.map(l => l.id);
      const style = map.getStyle();
      if (!style) return;

      const existingSources = style.sources || {};

      // 1. Remove old layers
      Object.keys(existingSources).forEach(sourceId => {
        if (sourceId.startsWith('orca-') && !currentIds.includes(sourceId.replace('orca-', ''))) {
          if (map.getLayer(sourceId)) map.removeLayer(sourceId);
          map.removeSource(sourceId);
        }
      });

      // 2. Add or update new layers
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

        // Zone filter visibility check
        let isVisible = visibleLayers.has(layer.id);
        if (selectedZone !== 'ALL') {
          if (selectedZone === 'PFZ' && !layer.id.includes('pfz')) isVisible = false;
          if (selectedZone === 'IMBL' && !layer.id.includes('imbl')) isVisible = false;
          if (selectedZone === 'Hazard' && !layer.id.includes('hazard') && !layer.id.includes('weather')) isVisible = false;
          if (selectedZone === 'SST' && !layer.id.includes('sst')) isVisible = false;
        }

        if (!map.getLayer(sourceId)) {
          const paint = {};

          if (layer.type === 'fill') {
            paint['fill-color'] = layer.style?.color || '#10B981';
            paint['fill-opacity'] = layer.style?.opacity !== undefined ? layer.style.opacity : 0.45;
            paint['fill-outline-color'] = '#ffffff';
          } else if (layer.type === 'line') {
            paint['line-color'] = layer.style?.color || '#00d4ff';
            paint['line-width'] = layer.style?.width || 3;
            paint['line-opacity'] = layer.style?.opacity !== undefined ? layer.style.opacity : 0.9;
          } else if (layer.type === 'circle') {
            paint['circle-color'] = layer.style?.color || '#F59E0B';
            paint['circle-radius'] = layer.style?.width || 7;
            paint['circle-opacity'] = 0.9;
            paint['circle-stroke-width'] = 2;
            paint['circle-stroke-color'] = '#ffffff';
          }

          map.addLayer({
            id: sourceId,
            type: layer.type,
            source: sourceId,
            paint: paint,
            layout: {
              visibility: isVisible ? 'visible' : 'none'
            }
          });

          // Interactive popup
          map.on('click', sourceId, (e) => {
            if (!e.features || !e.features.length) return;
            const coordinates = e.lngLat;
            const properties = e.features[0].properties;

            let html = '<div style="font-size:12px; font-family: Plus Jakarta Sans, sans-serif; line-height:1.5;">';
            html += '<div style="font-weight: 700; margin-bottom: 4px; color: #121714; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">📍 ' + (layer.label || 'Feature Details') + '</div>';
            for (const [key, value] of Object.entries(properties)) {
              if (key !== 'coordinates' && key !== 'geometry') {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                html += `<div><strong style="color:#64748b">${formattedKey}:</strong> ${value}</div>`;
              }
            }
            html += '</div>';

            new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
              .setLngLat(coordinates)
              .setHTML(html)
              .addTo(map);
          });
        } else {
          map.setLayoutProperty(
            sourceId, 
            'visibility', 
            isVisible ? 'visible' : 'none'
          );
        }
      });
    };

    if (map.isStyleLoaded()) {
      syncLayers();
    } else {
      map.on('load', syncLayers);
    }
  }, [layers, visibleLayers, selectedZone]);

  // Initial population of visible layers
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

  const handleZoneChange = (zone) => {
    setSelectedZone(zone);
    if (onTriggerZoneQuery) {
      onTriggerZoneQuery(zone, activePreset);
    }
  };

  return (
    <section aria-label="Geospatial Tactical Map" className={`map-card-container ${isMapExpanded ? 'expanded-map' : ''}`}>
      {/* Underlying MapLibre GL Interactive Canvas */}
      <div ref={mapContainer} className="maplibre-canvas-wrapper" />

      {/* FLOATING TOP BAR: Search pill & filters */}
      <div className="map-floating-top">
        {/* Glassy Search Bar with Ctrl+K focus */}
        <div className="search-pill-box">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#54625a' }}>search</span>
          <input 
            ref={searchInputRef}
            type="text" 
            value={searchVal} 
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchSubmit}
            placeholder="Search ocean zones, ports, coordinates..." 
          />
          <span className="shortcut-tag" onClick={() => searchInputRef.current?.focus()}>⌘K</span>
        </div>

        {/* Pill Filter Dropdowns */}
        <div className="filter-pills-row">
          <div className="filter-pill">
            <select value={selectedZone} onChange={(e) => handleZoneChange(e.target.value)}>
              <option value="ALL">All Layers</option>
              <option value="PFZ">Zone: PFZ Fishing</option>
              <option value="IMBL">Zone: IMBL Boundary</option>
              <option value="Hazard">Zone: Hazard Sectors</option>
              <option value="SST">Zone: Sea Temp (SST)</option>
            </select>
          </div>

          <div className="filter-pill">
            <select value={selectedState} onChange={(e) => {
              const state = e.target.value;
              setSelectedState(state);
              const found = Object.keys(COASTAL_PRESETS).find(k => COASTAL_PRESETS[k].state === state);
              if (found) flyToPort(found);
            }}>
              <option value="Tamil Nadu">State: Tamil Nadu</option>
              <option value="Kerala">State: Kerala</option>
              <option value="Maharashtra">State: Maharashtra</option>
              <option value="Andhra Pradesh">State: Andhra Pradesh</option>
              <option value="Goa">State: Goa</option>
              <option value="Gujarat">State: Gujarat</option>
            </select>
          </div>

          <div className="filter-pill">
            <select value={selectedPort} onChange={(e) => flyToPort(e.target.value)}>
              <option value="chennai">Port: Chennai</option>
              <option value="kochi">Port: Kochi</option>
              <option value="mumbai">Port: Mumbai</option>
              <option value="rameswaram">Port: Rameswaram</option>
              <option value="kanyakumari">Port: Kanyakumari</option>
              <option value="visakhapatnam">Port: Visakhapatnam</option>
              <option value="goa">Port: Goa</option>
              <option value="porbandar">Port: Porbandar</option>
            </select>
          </div>

          <button 
            className="filter-pill" 
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            title="Toggle Map Layers Panel"
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>layers</span>
            <span>Layers ({layers.length})</span>
          </button>

          <button 
            className="filter-pill" 
            onClick={onToggleExpandMap}
            title={isMapExpanded ? "Restore Dashboard Cards" : "Expand Map to Full Height"}
            type="button"
            style={{ background: isMapExpanded ? '#121714' : 'rgba(255, 255, 255, 0.92)', color: isMapExpanded ? '#ffffff' : '#121714' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {isMapExpanded ? 'collapse_content' : 'open_in_full'}
            </span>
            <span>{isMapExpanded ? 'Cards' : 'Full Map'}</span>
          </button>
        </div>
      </div>

      {/* Layer Panel Flyout */}
      {showLayerPanel && (
        <div className="layer-panel-dock">
          <h4>Tactical Marine Layers</h4>
          {layers.length === 0 ? (
            <p style={{ fontSize: 11, color: '#64748b', padding: '4px 0' }}>No active GeoJSON layers yet. Query the copilot to render layers.</p>
          ) : (
            layers.map(layer => (
              <label key={layer.id} className="layer-dock-item">
                <input 
                  type="checkbox" 
                  checked={visibleLayers.has(layer.id)} 
                  onChange={() => toggleLayer(layer.id)} 
                />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: layer.style?.color || '#00d4ff' }} />
                <span>{layer.label || layer.id}</span>
              </label>
            ))
          )}
        </div>
      )}

      {/* PINNED COASTAL INDICATOR & FLOATING DARK PILL METRIC BADGES */}
      <div className="map-floating-telemetry">
        <div className="coastal-sector-pin">
          <span className="sonar-pulse-ring" />
          <div className="sector-name-badge">
            {activePreset.name}
          </div>
        </div>

        <div className="floating-pills-stack">
          {/* PFZ Zones Badge */}
          <div className="dark-metric-pill" onClick={() => onTriggerZoneQuery && onTriggerZoneQuery('PFZ', activePreset)}>
            <span className="metric-pill-dot" />
            <span>{activePreset.pfz} PFZ Hotspots</span>
            <span className="metric-pill-sub">(Query)</span>
          </div>

          {/* Sea Surface Temp Badge */}
          <div className="dark-metric-pill" onClick={() => onTriggerZoneQuery && onTriggerZoneQuery('SST', activePreset)}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#F59E0B' }}>thermostat</span>
            <span>{activePreset.sst} Sea Surface Temp</span>
          </div>

          {/* Current Speed Badge */}
          <div className="dark-metric-pill" onClick={() => onTriggerZoneQuery && onTriggerZoneQuery('Hazard', activePreset)}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#38bdf8' }}>air</span>
            <span>{activePreset.current} Surface Velocity</span>
          </div>
        </div>
      </div>

      {/* MAP BOTTOM BAR: Controls, Real-time Coordinates & AI Copilot Launcher */}
      <div className="map-floating-bottom">
        <div className="map-zoom-tools">
          <div className="zoom-btn-pill">
            <button className="zoom-btn" onClick={() => handleZoom(0.8)} title="Zoom In" type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
            </button>
            <div className="zoom-divider" />
            <button className="zoom-btn" onClick={() => handleZoom(-0.8)} title="Zoom Out" type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>remove</span>
            </button>
            <div className="zoom-divider" />
            <button className="zoom-btn" onClick={onToggleFullScreen} title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Browser"} type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
          </div>

          {/* Real-time Cursor Coordinates */}
          <div className="map-sonar-tag">
            <span className="sonar-pulse-mini" />
            <span>{cursorCoords.lat}°N, {cursorCoords.lon}°E</span>
            {clickedPin && <span style={{ marginLeft: 6, color: '#38bdf8' }}>[Pinned]</span>}
          </div>
        </div>

        {/* Floating circular button for Marine AI Copilot */}
        <div className="ai-copilot-launcher">
          <span className="copilot-active-pill">
            Marine Copilot Active
          </span>
          <button 
            className="copilot-circle-btn" 
            onClick={onToggleChat}
            title="Open ORCA Marine AI Chatbot"
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#F59E0B' }}>auto_awesome</span>
            <span className="copilot-badge-dot" />
          </button>
        </div>
      </div>
    </section>
  );
}
