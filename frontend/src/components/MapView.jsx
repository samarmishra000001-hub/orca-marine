import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  FALLBACK_PFZ_GEOJSON,
  FALLBACK_IMBL_GEOJSON,
  FALLBACK_MPA_GEOJSON,
  FALLBACK_SST_GEOJSON,
  FALLBACK_CHLOROPHYLL_GEOJSON,
  generateClientProbe,
  calculateClientRoute
} from '../data/fallbackMarineData';

// Official India boundary GeoJSON sources (includes complete J&K, Ladakh, Lakshadweep, A&N Islands)
const INDIA_COMPOSITE_URL = 'https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson';
const INDIA_STATES_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';

const BASEMAP_STYLES = {
  voyager: {
    label: '🌊 Nautical Blue',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
  },
  dark: {
    label: '🌙 Abyssal Radar',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  },
  positron: {
    label: '🗺️ Minimal Chart',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  }
};

const TIME_STEPS = [-48, -24, -12, -6, 0, 6, 12, 24, 48, 72];

export default function MapView({ 
  layers = [], 
  centerCoords = [72.82, 18.92], 
  zoom = 6.5,
  userPersona = 'fisher',
  onAskAiAboutPoint,
  onProbedPointChange
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const routeMarkersRef = useRef([]);

  // Base state
  const [activeBasemap, setActiveBasemap] = useState('dark');
  const [activeTool, setActiveTool] = useState('probe'); // 'probe' | 'route' | 'pan'
  const [isLayerDockOpen, setIsLayerDockOpen] = useState(true);
  const [timelineHour, setTimelineHour] = useState(0);

  // Active layers state with opacities (0.0 to 1.0)
  const [layerStates, setLayerStates] = useState({
    pfz: { enabled: true, opacity: 0.85, name: 'Potential Fishing Zones (PFZ)', color: '#00d4ff' },
    sst: { enabled: true, opacity: 0.70, name: 'Sea Surface Temp (SST)', color: '#e67e22' },
    chlorophyll: { enabled: false, opacity: 0.65, name: 'Chlorophyll-a Plumes', color: '#2ecc71' },
    imbl: { enabled: true, opacity: 0.95, name: 'IMBL Border & 12NM Line', color: '#ff4d4d' },
    mpa: { enabled: true, opacity: 0.75, name: 'Marine Protected Areas (MPA)', color: '#10b981' },
    weather: { enabled: false, opacity: 0.60, name: 'Swell & Wind Vectors', color: '#38bdf8' },
    cyclone: { enabled: false, opacity: 0.80, name: 'Cyclone Track & Lightning', color: '#f59e0b' }
  });

  // Probe Inspector State
  const [probeData, setProbeData] = useState(null);
  const [isProbing, setIsProbing] = useState(false);

  // Route Planner State
  const [routeWaypoints, setRouteWaypoints] = useState([]);
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [isAnalyzingRoute, setIsAnalyzingRoute] = useState(false);
  const [isSimulatingVessel, setIsSimulatingVessel] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'https://orca-marine-xu7i.onrender.com';

  const safeFetch = async (urlPath, options = {}) => {
    try {
      let res = await fetch(`${apiBase}${urlPath}`, options);
      if (!res.ok) {
        res = await fetch(urlPath, options);
      }
      if (res.ok) return await res.json();
    } catch (e) {
      try {
        let res = await fetch(urlPath, options);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn(`Fetch error for ${urlPath}:`, err);
      }
    }
    return null;
  };

  // Smooth camera flyTo when centerCoords change
  useEffect(() => {
    if (mapRef.current && centerCoords && centerCoords.length === 2) {
      mapRef.current.flyTo({
        center: centerCoords,
        zoom: zoom || 6.5,
        speed: 1.2,
        curve: 1.4,
        essential: true
      });
    }
  }, [centerCoords, zoom]);

  // AI-Map Sync Event Listener
  useEffect(() => {
    const handleAIFlyTo = (e) => {
      if (!mapRef.current || !e.detail) return;
      const { lat, lon, zoom: targetZoom, enable_layers, label } = e.detail;
      
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: targetZoom || 7.5,
        speed: 1.2,
        curve: 1.4,
        essential: true
      });

      // Enable requested layers if specified
      if (enable_layers && Array.isArray(enable_layers)) {
        setLayerStates(prev => {
          const next = { ...prev };
          enable_layers.forEach(ly => {
            if (next[ly]) next[ly].enabled = true;
          });
          return next;
        });
      }

      // Drop highlight pulsing marker
      const el = document.createElement('div');
      el.className = 'ai-location-marker';
      el.innerHTML = `<div class="ai-marker-pulse"></div><div class="ai-marker-badge">${label || 'AI FOCUS'}</div>`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);

      setTimeout(() => marker.remove(), 8000);
    };

    window.addEventListener('orca-map-flyto', handleAIFlyTo);
    return () => window.removeEventListener('orca-map-flyto', handleAIFlyTo);
  }, []);

  // Add Official India Territory Vector Overlay
  const addIndiaOverlay = useCallback((map) => {
    if (map.getSource('india-boundary')) return;

    map.addSource('india-boundary', {
      type: 'geojson',
      data: INDIA_COMPOSITE_URL
    });

    map.addLayer({
      id: 'india-territory-fill',
      type: 'fill',
      source: 'india-boundary',
      paint: {
        'fill-color': '#00d4ff',
        'fill-opacity': 0.03
      }
    });

    map.addLayer({
      id: 'india-boundary-line',
      type: 'line',
      source: 'india-boundary',
      paint: {
        'line-color': '#00d4ff',
        'line-width': 1.8,
        'line-opacity': 0.7
      }
    });

    // Island annotations
    if (!map.getSource('islands-layer')) {
      map.addSource('islands-layer', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [72.64, 10.57] }, properties: { name: 'Lakshadweep (India)' } },
            { type: 'Feature', geometry: { type: 'Point', coordinates: [92.74, 11.66] }, properties: { name: 'Andaman & Nicobar (India)' } }
          ]
        }
      });

      map.addLayer({
        id: 'islands-labels',
        type: 'symbol',
        source: 'islands-layer',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'bottom',
          'text-offset': [0, -1]
        },
        paint: {
          'text-color': '#00d4ff',
          'text-halo-color': '#04131d',
          'text-halo-width': 2
        }
      });
    }
  }, []);

  // Initialize MapLibre GL
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[activeBasemap].url,
      center: centerCoords || [78.96, 18.59],
      zoom: zoom || 5.0,
      pitch: 35, // 3D perspective
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('error', (e) => {
      console.warn('MapLibre notice:', e?.error?.message || e);
    });

    map.on('load', () => {
      mapRef.current = map;
      try {
        addIndiaOverlay(map);
      } catch (err) {
        console.warn('India overlay notice:', err);
      }
      try {
        loadAllMarineLayers(map);
      } catch (err) {
        console.warn('Marine layers notice:', err);
      }
    });

    // Map Click Interaction Handler
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      // Depending on active tool:
      if (activeTool === 'probe') {
        handleProbeCoordinate(lat, lng);
      } else if (activeTool === 'route') {
        handleAddRouteWaypoint(lat, lng);
      }
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
      }
      mapRef.current = null;
    };
  }, [activeBasemap]);

  // Load and Wire All Built-in Marine Intelligence Layers
  const loadAllMarineLayers = async (map) => {
    if (!map) return;

    // 1. PFZ Hotspots Layer
    try {
      const pfzData = (await safeFetch('/api/marine/layers/pfz')) || FALLBACK_PFZ_GEOJSON;
      if (pfzData && !map.getSource('src-pfz')) {
        map.addSource('src-pfz', { type: 'geojson', data: pfzData });

        map.addLayer({
          id: 'lyr-pfz-fill',
          type: 'fill',
          source: 'src-pfz',
          paint: {
            'fill-color': '#00d4ff',
            'fill-opacity': layerStates.pfz.enabled ? layerStates.pfz.opacity * 0.25 : 0
          }
        });

        map.addLayer({
          id: 'lyr-pfz-line',
          type: 'line',
          source: 'src-pfz',
          paint: {
            'line-color': '#00d4ff',
            'line-width': 2.2,
            'line-opacity': layerStates.pfz.enabled ? layerStates.pfz.opacity : 0
          }
        });

        map.on('click', 'lyr-pfz-fill', (e) => {
          if (e.features && e.features[0]) {
            const props = e.features[0].properties;
            new maplibregl.Popup({ className: 'orca-map-popup' })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="popup-box">
                  <div class="popup-title">🐟 ${props.zone_name || 'Potential Fishing Zone'}</div>
                  <div class="popup-metric">Target: <strong>${props.target_species || 'Tuna & Mackerel'}</strong></div>
                  <div class="popup-desc">SST: ${props.sst_range || '28.2 - 28.9°C'} | Chl-a: ${props.chlorophyll_level || 'High'}</div>
                  <div class="popup-status">Confidence: ${props.confidence_score || '92%'}</div>
                </div>
              `)
              .addTo(map);
          }
        });
      }
    } catch (e) {
      console.warn('PFZ Layer notice:', e);
    }

    // 2. SST Thermal Layer
    try {
      const sstData = (await safeFetch('/api/marine/layers/sst')) || FALLBACK_SST_GEOJSON;
      if (sstData && !map.getSource('src-sst')) {
        map.addSource('src-sst', { type: 'geojson', data: sstData });

        map.addLayer({
          id: 'lyr-sst-points',
          type: 'circle',
          source: 'src-sst',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 12, 8, 28],
            'circle-blur': 0.85,
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'sst_celsius'],
              24.0, '#1e3a8a',
              26.5, '#0284c7',
              28.0, '#00d4ff',
              29.5, '#f59e0b',
              31.0, '#ef4444'
            ],
            'circle-opacity': layerStates.sst.enabled ? layerStates.sst.opacity * 0.75 : 0
          }
        });
      }
    } catch (e) {
      console.warn('SST Layer notice:', e);
    }

    // 3. Chlorophyll-a Plumes Layer
    try {
      const chlData = (await safeFetch('/api/marine/layers/chlorophyll')) || FALLBACK_CHLOROPHYLL_GEOJSON;
      if (chlData && !map.getSource('src-chlorophyll')) {
        map.addSource('src-chlorophyll', { type: 'geojson', data: chlData });

        map.addLayer({
          id: 'lyr-chl-fill',
          type: 'fill',
          source: 'src-chlorophyll',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': layerStates.chlorophyll.enabled ? layerStates.chlorophyll.opacity * 0.35 : 0
          }
        });

        map.addLayer({
          id: 'lyr-chl-line',
          type: 'line',
          source: 'src-chlorophyll',
          paint: {
            'line-color': '#34d399',
            'line-width': 1.5,
            'line-dasharray': [2, 2],
            'line-opacity': layerStates.chlorophyll.enabled ? layerStates.chlorophyll.opacity : 0
          }
        });
      }
    } catch (e) {
      console.warn('Chlorophyll Layer notice:', e);
    }

    // 4. IMBL Border Layer
    try {
      const imblData = (await safeFetch('/api/marine/layers/imbl')) || FALLBACK_IMBL_GEOJSON;
      if (imblData && !map.getSource('src-imbl')) {
        map.addSource('src-imbl', { type: 'geojson', data: imblData });

        map.addLayer({
          id: 'lyr-imbl-line',
          type: 'line',
          source: 'src-imbl',
          paint: {
            'line-color': '#ff4d4d',
            'line-width': 3.0,
            'line-dasharray': [3, 2],
            'line-opacity': layerStates.imbl.enabled ? layerStates.imbl.opacity : 0
          }
        });

        map.addLayer({
          id: 'lyr-imbl-glow',
          type: 'line',
          source: 'src-imbl',
          paint: {
            'line-color': '#ff0000',
            'line-width': 8.0,
            'line-blur': 4.0,
            'line-opacity': layerStates.imbl.enabled ? layerStates.imbl.opacity * 0.4 : 0
          }
        });
      }
    } catch (e) {
      console.warn('IMBL Layer notice:', e);
    }

    // 5. Marine Protected Areas (MPA) Layer
    try {
      const mpaData = (await safeFetch('/api/marine/layers/mpa')) || FALLBACK_MPA_GEOJSON;
      if (mpaData && !map.getSource('src-mpa')) {
        map.addSource('src-mpa', { type: 'geojson', data: mpaData });

        map.addLayer({
          id: 'lyr-mpa-fill',
          type: 'fill',
          source: 'src-mpa',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': layerStates.mpa.enabled ? layerStates.mpa.opacity * 0.30 : 0
          }
        });

        map.addLayer({
          id: 'lyr-mpa-line',
          type: 'line',
          source: 'src-mpa',
          paint: {
            'line-color': '#059669',
            'line-width': 2.5,
            'line-opacity': layerStates.mpa.enabled ? layerStates.mpa.opacity : 0
          }
        });

        map.on('click', 'lyr-mpa-fill', (e) => {
          if (e.features && e.features[0]) {
            const props = e.features[0].properties;
            new maplibregl.Popup({ className: 'orca-map-popup' })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="popup-box">
                  <div class="popup-title">🛡️ ${props.zone_name || 'Marine Sanctuary'}</div>
                  <div class="popup-metric">Focus: <strong>${props.conservation_focus || 'Coral & Marine Wildlife'}</strong></div>
                  <div class="popup-desc" style="color: #ff8080;">${props.restrictions || 'No mechanized trawling.'}</div>
                  <div class="popup-status">Penalty: ${props.enforcement_penalty || 'Wildlife Protection Act'}</div>
                </div>
              `)
              .addTo(map);
          }
        });
      }
    } catch (e) {
      console.warn('MPA Layer notice:', e);
    }

    // 6. Offshore Weather & Swell Zones
    const weatherData = await safeFetch('/api/marine/layers/weather');
    if (weatherData && !map.getSource('src-weather')) {
      map.addSource('src-weather', { type: 'geojson', data: weatherData });

      map.addLayer({
        id: 'lyr-weather-fill',
        type: 'fill',
        source: 'src-weather',
        paint: {
          'fill-color': '#0284c7',
          'fill-opacity': layerStates.weather.enabled ? layerStates.weather.opacity * 0.20 : 0
        }
      });

      map.addLayer({
        id: 'lyr-weather-line',
        type: 'line',
        source: 'src-weather',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.5,
          'line-opacity': layerStates.weather.enabled ? layerStates.weather.opacity : 0
        }
      });
    }

    // 7. Cyclone & Lightning Layer
    const cycloneData = await safeFetch('/api/marine/layers/cyclone');
    if (cycloneData && !map.getSource('src-cyclone')) {
      map.addSource('src-cyclone', { type: 'geojson', data: cycloneData });

      map.addLayer({
        id: 'lyr-cyclone-line',
        type: 'line',
        source: 'src-cyclone',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3.5,
          'line-opacity': layerStates.cyclone.enabled ? layerStates.cyclone.opacity : 0
        }
      });
    }
  };

  // Sync Layer Opacities and Visibilities to MapLibre
  const updateMapLayerPaint = (layerKey, enabled, opacity) => {
    const map = mapRef.current;
    if (!map) return;

    const layerMap = {
      pfz: ['lyr-pfz-fill', 'lyr-pfz-line'],
      sst: ['lyr-sst-points'],
      chlorophyll: ['lyr-chl-fill', 'lyr-chl-line'],
      imbl: ['lyr-imbl-line', 'lyr-imbl-glow'],
      mpa: ['lyr-mpa-fill', 'lyr-mpa-line'],
      weather: ['lyr-weather-fill', 'lyr-weather-line'],
      cyclone: ['lyr-cyclone-line']
    };

    const targetLayerIds = layerMap[layerKey] || [];
    targetLayerIds.forEach(id => {
      if (map.getLayer(id)) {
        if (id.includes('fill')) {
          map.setPaintProperty(id, 'fill-opacity', enabled ? opacity * 0.3 : 0);
        } else if (id.includes('line')) {
          map.setPaintProperty(id, 'line-opacity', enabled ? opacity : 0);
        } else if (id.includes('points')) {
          map.setPaintProperty(id, 'circle-opacity', enabled ? opacity * 0.75 : 0);
        }
      }
    });
  };

  const handleToggleLayer = (key) => {
    setLayerStates(prev => {
      const next = { ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } };
      updateMapLayerPaint(key, next[key].enabled, next[key].opacity);
      return next;
    });
  };

  const handleOpacityChange = (key, val) => {
    const opacity = parseFloat(val);
    setLayerStates(prev => {
      const next = { ...prev, [key]: { ...prev[key], opacity } };
      updateMapLayerPaint(key, next[key].enabled, opacity);
      return next;
    });
  };

  // ===========================================================================
  // SPATIAL TOOL 1: CLICK-TO-PROBE INSPECTOR
  // ===========================================================================
  const handleProbeCoordinate = async (lat, lon) => {
    const map = mapRef.current;
    if (!map) return;

    setIsProbing(true);

    // Drop or move pulsing pin
    if (activeMarkerRef.current) {
      activeMarkerRef.current.remove();
    }

    const pinEl = document.createElement('div');
    pinEl.className = 'probe-pin-container';
    pinEl.innerHTML = `<div class="probe-sonar-pulse"></div><div class="probe-center-dot"></div>`;
    
    activeMarkerRef.current = new maplibregl.Marker({ element: pinEl })
      .setLngLat([lon, lat])
      .addTo(map);

    try {
      const res = await safeFetch('/api/marine/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          timestamp_offset_hours: timelineHour,
          persona: userPersona
        })
      });

      if (res) {
        setProbeData(res);
        if (onProbedPointChange) {
          onProbedPointChange(res);
        }
      } else {
        const fallback = generateClientProbe(lat, lon, userPersona);
        setProbeData(fallback);
        if (onProbedPointChange) {
          onProbedPointChange(fallback);
        }
      }
    } catch (e) {
      console.warn("Probe error:", e);
      const fallback = generateClientProbe(lat, lon, userPersona);
      setProbeData(fallback);
      if (onProbedPointChange) {
        onProbedPointChange(fallback);
      }
    } finally {
      setIsProbing(false);
    }
  };

  // ===========================================================================
  // SPATIAL TOOL 2: VOYAGE & FUEL ROUTE PLANNER
  // ===========================================================================
  const handleAddRouteWaypoint = async (lat, lon) => {
    const map = mapRef.current;
    if (!map) return;

    const newWp = { lat, lon };
    const updated = [...routeWaypoints, newWp];
    setRouteWaypoints(updated);

    // Render waypoint marker on map
    const wpEl = document.createElement('div');
    wpEl.className = 'waypoint-marker';
    wpEl.innerText = `${updated.length}`;
    const marker = new maplibregl.Marker({ element: wpEl })
      .setLngLat([lon, lat])
      .addTo(map);
    routeMarkersRef.current.push(marker);

    // Update GeoJSON route line on map
    renderRouteLineOnMap(map, updated);

    // If at least 2 waypoints, analyze route
    if (updated.length >= 2) {
      setIsAnalyzingRoute(true);
      try {
        const res = await safeFetch('/api/marine/route-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waypoints: updated,
            vessel_speed_kts: 12.0,
            fuel_burn_lph: 18.0,
            vessel_type: 'motorized_boat'
          })
        });
        if (res) {
          setRouteAnalysis(res);
        } else {
          const fallback = calculateClientRoute(updated, 12.0, 18.0);
          setRouteAnalysis(fallback);
        }
      } catch (err) {
        console.warn("Route analysis error:", err);
        const fallback = calculateClientRoute(updated, 12.0, 18.0);
        setRouteAnalysis(fallback);
      } finally {
        setIsAnalyzingRoute(false);
      }
    }
  };

  const renderRouteLineOnMap = (map, waypoints) => {
    const coords = waypoints.map(w => [w.lon, w.lat]);
    const geojsonData = {
      type: 'FeatureCollection',
      features: coords.length >= 2 ? [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords }
        }
      ] : []
    };

    if (map.getSource('src-route-line')) {
      map.getSource('src-route-line').setData(geojsonData);
    } else {
      map.addSource('src-route-line', { type: 'geojson', data: geojsonData });
      map.addLayer({
        id: 'lyr-route-line',
        type: 'line',
        source: 'src-route-line',
        paint: {
          'line-color': '#00d4ff',
          'line-width': 3.5,
          'line-dasharray': [2, 2]
        }
      });
    }
  };

  const handleClearRoute = () => {
    setRouteWaypoints([]);
    setRouteAnalysis(null);
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
    if (mapRef.current && mapRef.current.getSource('src-route-line')) {
      mapRef.current.getSource('src-route-line').setData({ type: 'FeatureCollection', features: [] });
    }
  };

  const handleSimulateVessel = () => {
    if (routeWaypoints.length < 2 || !mapRef.current) return;
    setIsSimulatingVessel(true);

    const shipEl = document.createElement('div');
    shipEl.className = 'simulated-ship-marker';
    shipEl.innerHTML = `<span class="material-symbols-outlined text-[#00d4ff]">directions_boat</span>`;
    
    const shipMarker = new maplibregl.Marker({ element: shipEl })
      .setLngLat([routeWaypoints[0].lon, routeWaypoints[0].lat])
      .addTo(mapRef.current);

    let step = 0;
    const totalSteps = 100;
    const interval = setInterval(() => {
      step++;
      const ratio = step / totalSteps;
      const wpIndex = Math.min(Math.floor(ratio * (routeWaypoints.length - 1)), routeWaypoints.length - 2);
      const segRatio = (ratio * (routeWaypoints.length - 1)) - wpIndex;
      
      const p1 = routeWaypoints[wpIndex];
      const p2 = routeWaypoints[wpIndex + 1];
      const curLon = p1.lon + (p2.lon - p1.lon) * segRatio;
      const curLat = p1.lat + (p2.lat - p1.lat) * segRatio;

      shipMarker.setLngLat([curLon, curLat]);

      if (step >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => shipMarker.remove(), 2000);
        setIsSimulatingVessel(false);
      }
    }, 40);
  };

  // ===========================================================================
  // SPATIAL TOOL 3: 4D TIME-SCRUBBER TIMELINE
  // ===========================================================================
  const handleTimelineChange = (hour) => {
    setTimelineHour(hour);
    // If active probed point, refresh probe with new timeline hour
    if (probeData && probeData.lat && probeData.lon) {
      handleProbeCoordinate(probeData.lat, probeData.lon);
    }
  };

  return (
    <div className="mapview-root-container">
      <div ref={mapContainer} className="maplibre-viewport" />

      {/* TOP-LEFT: SPATIAL TOOLS DOCK */}
      <div className="map-spatial-tools-dock ocean-glass">
        <button
          type="button"
          className={`spatial-tool-btn ${activeTool === 'probe' ? 'active' : ''}`}
          onClick={() => setActiveTool('probe')}
          title="Click-to-Probe: Inspect water column, wave parameters, and geofence clearance"
        >
          <span className="material-symbols-outlined text-base">pin_drop</span>
          <span>PROBE</span>
        </button>

        <button
          type="button"
          className={`spatial-tool-btn ${activeTool === 'route' ? 'active' : ''}`}
          onClick={() => setActiveTool('route')}
          title="Voyage Planner: Draw waypoints to calculate distance, fuel burn, and safety corridors"
        >
          <span className="material-symbols-outlined text-base">alt_route</span>
          <span>PLAN ROUTE</span>
        </button>

        <div className="spatial-dock-sep" />

        <button
          type="button"
          className={`spatial-tool-btn ${isLayerDockOpen ? 'active' : ''}`}
          onClick={() => setIsLayerDockOpen(prev => !prev)}
          title="Toggle Multi-Layer Control Dock"
        >
          <span className="material-symbols-outlined text-base">layers</span>
          <span>LAYERS</span>
        </button>

        {/* Basemap Switcher */}
        <select
          className="basemap-selector-pill"
          value={activeBasemap}
          onChange={(e) => setActiveBasemap(e.target.value)}
          title="Select Nautical Chart Basemap"
        >
          <option value="dark">Abyssal Dark</option>
          <option value="voyager">Nautical Blue</option>
          <option value="positron">Light Chart</option>
        </select>
      </div>

      {/* FLOATING LAYER CONTROL DOCK WITH OPACITY SLIDERS & LEGENDS */}
      {isLayerDockOpen && (
        <div className="map-layer-dock-card ocean-glass">
          <div className="layer-dock-header">
            <span className="material-symbols-outlined text-[#00d4ff] text-sm">tune</span>
            <span className="layer-dock-title">TACTICAL LAYER MATRIX</span>
            <button 
              type="button" 
              className="layer-dock-close"
              onClick={() => setIsLayerDockOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="layer-dock-list">
            {Object.keys(layerStates).map((key) => {
              const lyr = layerStates[key];
              return (
                <div key={key} className="layer-dock-item">
                  <div className="layer-item-top">
                    <label className="layer-switch-label">
                      <input
                        type="checkbox"
                        checked={lyr.enabled}
                        onChange={() => handleToggleLayer(key)}
                      />
                      <span className="layer-color-dot" style={{ background: lyr.color }} />
                      <span className="layer-label-text">{lyr.name}</span>
                    </label>
                    <span className="layer-opacity-val">{Math.round(lyr.opacity * 100)}%</span>
                  </div>

                  {lyr.enabled && (
                    <div className="layer-slider-row">
                      <span className="slider-label">Opacity:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={lyr.opacity}
                        onChange={(e) => handleOpacityChange(key, e.target.value)}
                        className="layer-slider-input"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Color-Ramp Legends */}
          <div className="layer-legends-panel">
            <div className="legend-section">
              <span className="legend-title">SST THERMAL RAMP (°C)</span>
              <div className="sst-color-bar" />
              <div className="legend-labels-row">
                <span>24°C</span>
                <span>27°C</span>
                <span>29°C</span>
                <span>31°C+</span>
              </div>
            </div>

            <div className="legend-section" style={{ marginTop: '6px' }}>
              <span className="legend-title">CHLOROPHYLL DENSITY</span>
              <div className="chl-color-bar" />
              <div className="legend-labels-row">
                <span>0.1 (Oligotrophic)</span>
                <span>1.5 (Favorable)</span>
                <span>4.0+ (Bloom)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING OCEANOGRAPHIC PROBE CARD */}
      {probeData && activeTool === 'probe' && (
        <div className="oceanographic-probe-card ocean-glass">
          <div className="probe-card-header">
            <div className="probe-title-col">
              <span className="probe-card-title">OCEANOGRAPHIC BUOY PROBE</span>
              <span className="probe-card-coords">
                LAT {probeData.lat.toFixed(3)}°N · LON {probeData.lon.toFixed(3)}°E
              </span>
            </div>
            <button 
              type="button" 
              className="probe-close-btn"
              onClick={() => setProbeData(null)}
            >
              ✕
            </button>
          </div>

          <div className="probe-metrics-grid">
            <div className="probe-metric-box">
              <span className="probe-box-label">SST TEMP</span>
              <span className="probe-box-val text-[#E6A448]">{probeData.sst_c}°C</span>
            </div>
            <div className="probe-metric-box">
              <span className="probe-box-label">CHLOROPHYLL</span>
              <span className="probe-box-val text-[#2ECC71]">{probeData.chlorophyll_mg_m3} mg/m³</span>
            </div>
            <div className="probe-metric-box">
              <span className="probe-box-label">WAVE SWELL</span>
              <span className="probe-box-val text-[#00d4ff]">{probeData.wave_height_m}m</span>
            </div>
            <div className="probe-metric-box">
              <span className="probe-box-label">WIND SPEED</span>
              <span className="probe-box-val">{probeData.wind_speed_kts} kts</span>
            </div>
          </div>

          {/* Proximity Distances in NM */}
          <div className="probe-distances-list">
            {probeData.nearest_pfz && (
              <div className="probe-dist-row">
                <span className="dist-name">Nearest PFZ Hotspot:</span>
                <span className="dist-num text-[#00d4ff]">{probeData.nearest_pfz.distance_nm} NM ({probeData.nearest_pfz.name})</span>
              </div>
            )}
            {probeData.imbl_distance && (
              <div className="probe-dist-row">
                <span className="dist-name">IMBL Border Distance:</span>
                <span className={`dist-num ${probeData.imbl_distance.distance_nm < 5 ? 'text-[#ff4d4d] font-bold' : 'text-[#E6A448]'}`}>
                  {probeData.imbl_distance.distance_nm} NM ({probeData.imbl_distance.status})
                </span>
              </div>
            )}
            {probeData.nearest_mpa && (
              <div className="probe-dist-row">
                <span className="dist-name">Nearest MPA Sanctuary:</span>
                <span className="dist-num text-[#10b981]">{probeData.nearest_mpa.distance_nm} NM ({probeData.nearest_mpa.name})</span>
              </div>
            )}
          </div>

          {/* Persona Human Advisory */}
          <div className="probe-advisory-box">
            <div className="advisory-title">
              {userPersona === 'fisher' && '🎣 FISHER LIVELIHOOD ADVISORY:'}
              {userPersona === 'coast_guard' && '⚓ COAST GUARD TACTICAL BRIEF:'}
              {userPersona === 'researcher' && '🔬 CONSERVATION RESEARCH NOTES:'}
            </div>
            <div className="advisory-text">{probeData.human_advisory}</div>
          </div>

          {/* Ask ORCA AI button */}
          <button
            type="button"
            className="probe-ask-ai-btn"
            onClick={() => {
              if (onAskAiAboutPoint) {
                onAskAiAboutPoint(
                  `Provide deep marine intelligence analysis for coordinates ${probeData.lat.toFixed(2)}°N, ${probeData.lon.toFixed(2)}°E (SST: ${probeData.sst_c}°C, Wave: ${probeData.wave_height_m}m, Risk: ${probeData.risk_level})`
                );
              }
            }}
          >
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            <span>Ask ORCA AI About This Spot</span>
          </button>
        </div>
      )}

      {/* FLOATING VOYAGE TELEMETRY CARD (ROUTE PLANNER) */}
      {activeTool === 'route' && (
        <div className="voyage-telemetry-card ocean-glass">
          <div className="voyage-card-header">
            <div className="voyage-title-row">
              <span className="material-symbols-outlined text-[#00d4ff] text-base">route</span>
              <span className="voyage-title">VOYAGE &amp; RISK PLANNER</span>
            </div>
            <span className="waypoint-count-chip">{routeWaypoints.length} WAYPOINTS</span>
          </div>

          {routeWaypoints.length === 0 ? (
            <div className="route-helper-text">
              Click on the map to place departure, transit, and destination waypoints.
            </div>
          ) : routeAnalysis ? (
            <>
              <div className="voyage-metrics-row">
                <div className="voyage-metric-col">
                  <span className="voyage-label">DISTANCE</span>
                  <span className="voyage-val text-[#00d4ff]">{routeAnalysis.total_distance_nm} NM</span>
                  <span className="voyage-subval">({routeAnalysis.total_distance_km} km)</span>
                </div>
                <div className="voyage-metric-col">
                  <span className="voyage-label">EST. TRANSIT</span>
                  <span className="voyage-val">{routeAnalysis.eta_hours} hrs</span>
                  <span className="voyage-subval">@ 12 kts</span>
                </div>
                <div className="voyage-metric-col">
                  <span className="voyage-label">EST. FUEL BURN</span>
                  <span className="voyage-val text-[#E6A448]">{routeAnalysis.estimated_fuel_liters} L</span>
                  <span className="voyage-subval">Diesel</span>
                </div>
              </div>

              {/* Geofence Warnings */}
              {routeAnalysis.crosses_mpa && (
                <div className="voyage-warning-banner mpa">
                  <span className="material-symbols-outlined text-xs">gavel</span>
                  <span>WARNING: Route intersects protected Marine National Park zone!</span>
                </div>
              )}
              {routeAnalysis.imbl_warning && (
                <div className="voyage-warning-banner imbl">
                  <span className="material-symbols-outlined text-xs">fmd_bad</span>
                  <span>BORDER ALERT: Path approaches within 5 NM of International Maritime Boundary!</span>
                </div>
              )}

              <div className="voyage-rec-box">
                {routeAnalysis.recommendation}
              </div>

              <div className="voyage-actions-row">
                <button
                  type="button"
                  className="voyage-action-btn simulate"
                  onClick={handleSimulateVessel}
                  disabled={isSimulatingVessel}
                >
                  <span className="material-symbols-outlined text-xs">play_arrow</span>
                  <span>{isSimulatingVessel ? 'SIMULATING...' : 'SIMULATE VESSEL'}</span>
                </button>
                <button
                  type="button"
                  className="voyage-action-btn clear"
                  onClick={handleClearRoute}
                >
                  <span className="material-symbols-outlined text-xs">delete</span>
                  <span>CLEAR</span>
                </button>
              </div>
            </>
          ) : (
            <div className="route-helper-text">
              {isAnalyzingRoute ? 'Analyzing navigational hydrodynamics & border geofencing...' : 'Add 1 more waypoint to compute route.'}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM 4D TIME-SCRUBBER TIMELINE BAR */}
      <div className="bottom-time-scrubber-bar ocean-glass-light">
        <div className="scrubber-label-col">
          <span className="scrubber-title">4D TIME SCRUBBER</span>
          <span className="scrubber-status-chip">
            {timelineHour === 0 ? 'LIVE TELEMETRY' : timelineHour < 0 ? `${timelineHour}h HISTORICAL` : `+${timelineHour}h FORECAST`}
          </span>
        </div>

        <div className="scrubber-steps-track">
          {TIME_STEPS.map((step) => {
            const isActive = timelineHour === step;
            return (
              <button
                key={step}
                type="button"
                className={`scrubber-step-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTimelineChange(step)}
              >
                <span className="scrubber-step-dot" />
                <span className="scrubber-step-label">{step === 0 ? 'NOW' : step > 0 ? `+${step}h` : `${step}h`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
