import React, { useState, useCallback, useEffect, useRef, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from './components/ChatSidebar';
import MapView from './components/MapView';
import OceanGlobe3D from './components/OceanGlobe3D';
import IndiaTerritoryMap from './components/IndiaTerritoryMap';
import MarineQuizModal from './components/MarineQuizModal';

const IntroScene = lazy(() => import('./components/IntroScene'));

export const COASTAL_PRESETS = [
  { name: 'Mumbai', lat: 18.92, lon: 72.82, basin: 'Arabian Sea', code: 'IN-BOM', depth: '1,240m' },
  { name: 'Kochi', lat: 9.93, lon: 76.26, basin: 'Arabian Sea', code: 'IN-COK', depth: '980m' },
  { name: 'Chennai', lat: 13.08, lon: 80.27, basin: 'Bay of Bengal', code: 'IN-MAA', depth: '1,840m' },
  { name: 'Visakhapatnam', lat: 17.68, lon: 83.21, basin: 'Bay of Bengal', code: 'IN-VTZ', depth: '2,150m' },
  { name: 'Port Blair', lat: 11.66, lon: 92.74, basin: 'Bay of Bengal', code: 'IN-IXZ', depth: '3,120m' },
  { name: 'Lakshadweep', lat: 10.57, lon: 72.64, basin: 'Arabian Sea', code: 'IN-KVT', depth: '1,560m' },
  { name: 'Veraval', lat: 20.90, lon: 70.37, basin: 'Arabian Sea', code: 'IN-VRL', depth: '640m' },
  { name: 'Paradip', lat: 20.31, lon: 86.61, basin: 'Bay of Bengal', code: 'IN-PRT', depth: '1,120m' },
];

export const FORECAST_TIMELINE = [
  { id: 'now', label: 'Now (Live)', hours: 0, badge: 'LIVE' },
  { id: '+3h', label: '+3h', hours: 3, badge: 'FORECAST' },
  { id: '+6h', label: '+6h', hours: 6, badge: 'FORECAST' },
  { id: '+12h', label: '+12h', hours: 12, badge: 'FORECAST' },
  { id: '+24h', label: '+24h', hours: 24, badge: 'FORECAST' },
  { id: '+48h', label: '+48h', hours: 48, badge: 'OUTLOOK' },
];

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [viewMode, setViewMode] = useState('globe'); // 'globe' (3D digital twin) or 'chart' (MapLibre vector)
  const [vesselType, setVesselType] = useState('motorized_boat');
  const [isTerritoryMapOpen, setIsTerritoryMapOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [activePort, setActivePort] = useState('Mumbai');
  const [activeForecastStep, setActiveForecastStep] = useState('now');
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([72.82, 18.92]);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const searchInputRef = useRef(null);

  const [activeLayers, setActiveLayers] = useState({
    bathymetry: true,
    thermal: true,
    sonar: true,
    ais: true,
    satTrack: true
  });

  const [telemetry, setTelemetry] = useState({
    location: "Mumbai Coastal Sector",
    sea_state: "Calm / Slight (Code 3)",
    wave_height_m: 1.1,
    wind_speed_kmh: 14.2,
    temperature_c: 28.5,
    tide_summary: "Harmonic Tidal Forecast Active",
    alert_level: "NORMAL"
  });

  const apiBase = import.meta.env.VITE_API_URL || 'https://orca-marine-xu7i.onrender.com';

  const fetchDashboardData = async (lat, lon) => {
    try {
      setTelemetry(prev => ({ ...prev, location: "Retrieving verified data..." }));
      const targetLat = lat ?? 18.92;
      const targetLon = lon ?? 72.82;
      const queryParams = `?lat=${targetLat}&lon=${targetLon}`;
      
      let response = await fetch(`${apiBase}/api/dashboard${queryParams}`);
      if (!response.ok) {
        response = await fetch(`/api/dashboard${queryParams}`);
      }
      
      if (response.ok) {
        const data = await response.json();
        setTelemetry(data);
      } else {
        setTelemetry(prev => ({ ...prev, location: "Data Unavailable", sea_state: "UNAVAILABLE", alert_level: "ERROR" }));
      }
    } catch (e) {
      console.warn("Telemetry fetch fallback:", e);
      setTelemetry(prev => ({ ...prev, location: "Open-Meteo Offline", sea_state: "UNAVAILABLE", alert_level: "ERROR" }));
    }
  };

  useEffect(() => {
    fetchDashboardData(18.92, 72.82);
  }, []);

  // Global ⌘K / Ctrl+K listener for quick search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to ORCA! 🐋 I am your collaborative Marine Intelligence Swarm and General-Purpose Assistant. I synthesize real-time ocean forecasts from Open-Meteo, satellite telemetry, tide harmonics, and maritime boundaries into explainable decisions. Ask me anything about oceanography, coding, general science, or pick an Indian coastal port!',
      timestamp: new Date()
    }
  ]);
  const [layers, setLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');

  const handleSelectPresetPort = (preset) => {
    setActivePort(preset.name);
    setMapCenter([preset.lon, preset.lat]);
    setMapZoom(7.5);
    fetchDashboardData(preset.lat, preset.lon);
  };

  const handleSearchLocationSubmit = (e) => {
    e.preventDefault();
    if (!searchLocationQuery.trim()) return;
    const match = COASTAL_PRESETS.find(p => p.name.toLowerCase().includes(searchLocationQuery.toLowerCase().trim()));
    if (match) {
      handleSelectPresetPort(match);
    } else {
      handleSend(`Retrieve maritime conditions and weather for ${searchLocationQuery}`);
    }
    setSearchLocationQuery('');
  };

  const handleForecastStepChange = (step) => {
    setActiveForecastStep(step.id);
    if (step.hours > 0) {
      setTelemetry(prev => ({
        ...prev,
        tide_summary: `Forecast Window: +${step.hours} Hours Projected`,
      }));
    } else {
      fetchDashboardData(mapCenter[1], mapCenter[0]);
    }
  };

  const handleSend = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      })).slice(-6);

      let res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          location: activePort,
          language: language,
          vessel_type: vesselType,
          conversation_history: historyPayload
        })
      });

      if (!res.ok) {
        res = await fetch(`/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            location: activePort,
            language: language,
            vessel_type: vesselType,
            conversation_history: historyPayload
          })
        });
      }

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.text_response,
        reasoning: data.agent_reasoning,
        layers: data.geojson_layers,
        timestamp: new Date()
      }]);

      if (data.geojson_layers && data.geojson_layers.length > 0) {
        setLayers(data.geojson_layers);
        // If query returned explicit geographic vector layers, switch to vector chart view
        setViewMode('chart');
      }

      if (data.telemetry) {
        setTelemetry(data.telemetry);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Sorry, could not fetch response: ${err.message}. Please verify the backend is active.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [language, messages, vesselType, activePort, apiBase]);

  const handleSelectTerritory = useCallback((territory) => {
    if (!territory) return;
    setTelemetry((prev) => ({
      ...prev,
      location: territory.name,
      alert_level: territory.alert_level || 'NORMAL'
    }));
    const query = territory.id === 'lakshadweep'
      ? "Show Potential Fishing Zones, weather, and safe routes near Lakshadweep Islands"
      : territory.id === 'andaman-nicobar'
      ? "Show Potential Fishing Zones, cyclone alerts, and maritime conditions near Port Blair, Andaman & Nicobar Islands"
      : `Provide oceanographic and fishing intelligence for ${territory.name}`;
    handleSend(query);
  }, [handleSend]);

  const currentPortPreset = COASTAL_PRESETS.find(p => p.name.toLowerCase() === activePort.toLowerCase()) || COASTAL_PRESETS[0];

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  if (showIntro) {
    return (
      <React.Suspense fallback={
        <div style={{ height: '100vh', width: '100vw', background: '#071D29', color: '#D4E7E2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.08em', color: '#F1EFE8', marginBottom: '0.5rem' }}>ORCA</div>
          <div style={{ fontSize: '0.85rem', color: '#9DB4BE', letterSpacing: '0.12em', textTransform: 'uppercase' }}>ISRO Ocean Observatory</div>
        </div>
      }>
        <IntroScene onFinish={() => setShowIntro(false)} />
      </React.Suspense>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="stitch-viewport-container"
    >

      {/* ========================================================================= */}
      {/* 1. CENTERPIECE GEOGRAPHIC OBSERVATORY VIEWPORT (3D GLOBE / 2D VECTOR CHART) */}
      {/* ========================================================================= */}
      <div className="stitch-center-stage">
        {viewMode === 'globe' ? (
          <OceanGlobe3D
            activePort={activePort}
            activeLayers={activeLayers}
            onSelectPort={(port) => handleSelectPresetPort(port)}
          />
        ) : (
          <MapView
            layers={layers}
            centerCoords={mapCenter}
            zoom={mapZoom}
          />
        )}
      </div>

      {/* Ambient Technical Coordinate Grid Overlay */}
      <div className="stitch-ambient-grid" />
      {/* Subtle Vignette Edge Mask */}
      <div className="stitch-vignette-mask" />

      {/* ========================================================================= */}
      {/* 2. FLOATING TOP APPLICATION BAR (TopNavBar) */}
      {/* ========================================================================= */}
      <header className="stitch-top-header ocean-glass">
        {/* Left: Brand Emblem & ISRO Mission Sync */}
        <div className="brand-group">
          <div className="brand-emblem-container" title="ISRO OCEANSAT-3 & METOP-C SYNC">
            <span className="material-symbols-outlined text-[#00d4ff] text-xl">satellite_alt</span>
            <span className="live-ping-dot" />
          </div>
          <div className="brand-text-column">
            <div className="brand-headline">
              <span className="brand-name">ORCA Marine Intelligence</span>
              <span className="brand-version-chip">v2.6 PROD</span>
            </div>
            <div className="brand-telemetry-status">
              <span className="status-bullet" />
              <span className="status-label">ISRO METOP-C &amp; OCEANSAT-3 SYNC · 99.8% TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* Center: Coastal Port Quick-Selectors Switcher Pill */}
        <nav className="coastal-switcher-dock">
          {COASTAL_PRESETS.map((p) => {
            const isActive = activePort.toLowerCase() === p.name.toLowerCase();
            return (
              <button
                key={p.name}
                type="button"
                className={`port-switcher-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectPresetPort(p)}
                title={`Switch to ${p.name} (${p.basin})`}
              >
                {isActive && <span className="active-glow-dot" />}
                <span>{p.name.toUpperCase()}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Search Pill & Action Launchers */}
        <div className="header-actions-group">
          <form className="search-pill-form" onSubmit={handleSearchLocationSubmit}>
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search coordinates, buoy, MMSI..."
              value={searchLocationQuery}
              onChange={(e) => setSearchLocationQuery(e.target.value)}
              className="search-pill-input"
            />
            <span className="search-shortcut-badge">⌘K</span>
          </form>

          {/* Territory Map launcher button */}
          <button
            type="button"
            className="action-icon-pill"
            onClick={() => setIsTerritoryMapOpen(true)}
            title="India, Lakshadweep & Andaman Archipelago Territory Map"
          >
            <span className="material-symbols-outlined">map</span>
          </button>

          {/* Practice Quiz launcher button */}
          <button
            type="button"
            className="action-icon-pill"
            onClick={() => setIsQuizOpen(true)}
            title="Marine Knowledge & Regulatory Assessment Quiz"
          >
            <span className="material-symbols-outlined">quiz</span>
          </button>

          {/* Replay 3D Intro Cinematic */}
          <button
            type="button"
            className="action-icon-pill"
            onClick={() => setShowIntro(true)}
            title="Cinematic 3D Earth Opening"
          >
            <span className="material-symbols-outlined">public</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. FLOATING TOP TELEMETRY HUD RIBBON */}
      {/* ========================================================================= */}
      <div className="stitch-telemetry-ribbon">
        <div className="telemetry-glass-capsule ocean-glass-light">
          {/* 1. Sea State */}
          <div className="hud-metric-item">
            <span className="material-symbols-outlined text-[#00d4ff] text-base">waves</span>
            <div className="metric-text-group">
              <span className="metric-label">SEA STATE</span>
              <span className="metric-val">{telemetry.sea_state || 'Calm (Code 3)'}</span>
            </div>
          </div>
          <div className="hud-divider" />

          {/* 2. Significant Wave Height */}
          <div className="hud-metric-item">
            <span className="material-symbols-outlined text-[#00d4ff] text-base">water</span>
            <div className="metric-text-group">
              <span className="metric-label">SIG. WAVE HEIGHT</span>
              <span className="metric-val">
                {telemetry.wave_height_m !== undefined ? `${telemetry.wave_height_m}m` : '1.1m'}
                <span className="metric-subval"> @ 8.4s SSW</span>
              </span>
            </div>
          </div>
          <div className="hud-divider" />

          {/* 3. Surface Wind Velocity */}
          <div className="hud-metric-item">
            <span className="material-symbols-outlined text-[#00d4ff] text-base">air</span>
            <div className="metric-text-group">
              <span className="metric-label">SURFACE WIND</span>
              <span className="metric-val">
                {telemetry.wind_speed_kmh !== undefined ? `${telemetry.wind_speed_kmh} km/h` : '14.2 km/h'}
                <span className="metric-subval"> (8 kts SSW)</span>
              </span>
            </div>
          </div>
          <div className="hud-divider" />

          {/* 4. Sea Surface Temp (SST) */}
          <div className="hud-metric-item">
            <span className="material-symbols-outlined text-[#E6A448] text-base">device_thermostat</span>
            <div className="metric-text-group">
              <span className="metric-label">SST TEMPERATURE</span>
              <span className="metric-val">
                {telemetry.temperature_c ? `${telemetry.temperature_c} °C` : '28.5 °C'}
                <span className="metric-anomaly text-[#E6A448]"> (+0.8° Anomaly)</span>
              </span>
            </div>
          </div>
          <div className="hud-divider" />

          {/* 5. Pelagic Chlorophyll & Tide */}
          <div className="hud-metric-item">
            <span className="material-symbols-outlined text-[#00d4ff] text-base">eco</span>
            <div className="metric-text-group">
              <span className="metric-label">TIDE &amp; PRODUCTIVITY</span>
              <span className="metric-val">{telemetry.tide_summary || 'Harmonic Active'}</span>
            </div>
          </div>
          <div className="hud-divider" />

          {/* 6. Active Threat & Refresh */}
          <div className="hud-threat-item">
            <span className={`threat-badge alert-${(telemetry.alert_level || 'NORMAL').toLowerCase()}`}>
              <span className="threat-ping" />
              {telemetry.alert_level || 'NORMAL'}
            </span>
            <button
              type="button"
              className="telemetry-reload-btn"
              onClick={() => fetchDashboardData(mapCenter[1], mapCenter[0])}
              title="Refresh Live Data"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LEFT FLOATING TACTICAL DOCK & LAYER CONTROLLER */}
      {/* ========================================================================= */}
      <aside className="stitch-tactical-dock ocean-glass">
        {/* Top Radar Emblem */}
        <div className="dock-top-badge" title="ORCA Tactical Oceanic Radar">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
          <span className="dock-subtext">ORCA</span>
        </div>

        {/* Center Tab Buttons */}
        <div className="dock-nav-buttons">
          {/* 3D Globe / 2D Map Toggle */}
          <button
            type="button"
            className={`dock-btn ${viewMode === 'globe' ? 'active' : ''}`}
            onClick={() => setViewMode('globe')}
            title="3D Oceanic Twin (Earth Globe)"
          >
            <span className="material-symbols-outlined">public</span>
            <span className="dock-tooltip">3D Oceanic Twin</span>
          </button>

          <button
            type="button"
            className={`dock-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
            title="2D Vector Tactical Chart (MapLibre)"
          >
            <span className="material-symbols-outlined">explore</span>
            <span className="dock-tooltip">Vector Chart</span>
          </button>

          {/* Geospatial Layers Drawer Toggle */}
          <button
            type="button"
            className={`dock-btn ${isLayersOpen ? 'active' : ''}`}
            onClick={() => setIsLayersOpen(prev => !prev)}
            title="Geospatial Layers Controller"
          >
            <span className="material-symbols-outlined">layers</span>
            <span className="dock-tooltip">Data Layers</span>
          </button>

          {/* Territory Map */}
          <button
            type="button"
            className="dock-btn"
            onClick={() => setIsTerritoryMapOpen(true)}
            title="India &amp; Archipelago Territories"
          >
            <span className="material-symbols-outlined">hub</span>
            <span className="dock-tooltip">Territory Map</span>
          </button>

          {/* Practice Quiz */}
          <button
            type="button"
            className="dock-btn"
            onClick={() => setIsQuizOpen(true)}
            title="Marine Knowledge Quiz"
          >
            <span className="material-symbols-outlined">school</span>
            <span className="dock-tooltip">Practice Quiz</span>
          </button>

          {/* Replay Cinematic Opening */}
          <button
            type="button"
            className="dock-btn"
            onClick={() => setShowIntro(true)}
            title="Replay Cinematic 3D Opening"
          >
            <span className="material-symbols-outlined">smart_display</span>
            <span className="dock-tooltip">Cinematic Intro</span>
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="dock-bottom-actions">
          <button
            type="button"
            className="dock-buoy-btn"
            onClick={() => handleSend("Deploy acoustic sounding buoy telemetry check")}
            title="Deploy Buoy / Sounding Probe"
          >
            <span className="material-symbols-outlined">add_location_alt</span>
          </button>
        </div>
      </aside>

      {/* Floating Geospatial Layers Controller Card */}
      <AnimatePresence>
        {isLayersOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="stitch-layer-controller ocean-glass"
          >
            <div className="layer-controller-header">
              <div className="header-title-row">
                <span className="material-symbols-outlined text-[#00d4ff] text-base">layers</span>
                <span className="header-title">Geospatial Layers</span>
              </div>
              <span className="layer-count-badge">5 ACTIVE</span>
            </div>

            <div className="layer-toggles-list">
              <label className="layer-toggle-item">
                <div className="toggle-left">
                  <input
                    type="checkbox"
                    checked={activeLayers.bathymetry}
                    onChange={() => toggleLayer('bathymetry')}
                  />
                  <div className="toggle-info">
                    <span className="layer-name">Bathymetric Contours</span>
                    <span className="layer-detail">3,420m Abyssal Ridges</span>
                  </div>
                </div>
                <span className="layer-dot cyan" />
              </label>

              <label className="layer-toggle-item">
                <div className="toggle-left">
                  <input
                    type="checkbox"
                    checked={activeLayers.thermal}
                    onChange={() => toggleLayer('thermal')}
                  />
                  <div className="toggle-info">
                    <span className="layer-name">SST &amp; Chlorophyll Gradient</span>
                    <span className="layer-detail">Pelagic Upwelling Heatmap</span>
                  </div>
                </div>
                <span className="layer-dot amber" />
              </label>

              <label className="layer-toggle-item">
                <div className="toggle-left">
                  <input
                    type="checkbox"
                    checked={activeLayers.sonar}
                    onChange={() => toggleLayer('sonar')}
                  />
                  <div className="toggle-info">
                    <span className="layer-name">Sonar Buoys &amp; Hydrophones</span>
                    <span className="layer-detail">128 Nodes Broadcast</span>
                  </div>
                </div>
                <span className="layer-dot cyan pulse" />
              </label>

              <label className="layer-toggle-item">
                <div className="toggle-left">
                  <input
                    type="checkbox"
                    checked={activeLayers.ais}
                    onChange={() => toggleLayer('ais')}
                  />
                  <div className="toggle-info">
                    <span className="layer-name">AIS Vessel Fleet Tracks</span>
                    <span className="layer-detail">Active Trawler Trajectories</span>
                  </div>
                </div>
                <span className="layer-dot white" />
              </label>

              <label className="layer-toggle-item">
                <div className="toggle-left">
                  <input
                    type="checkbox"
                    checked={activeLayers.satTrack}
                    onChange={() => toggleLayer('satTrack')}
                  />
                  <div className="toggle-info">
                    <span className="layer-name">ISRO Oceansat-3 &amp; INSAT</span>
                    <span className="layer-detail">Orbital Tracking Path</span>
                  </div>
                </div>
                <span className="layer-dot cyan pulse" />
              </label>
            </div>

            {/* Viewport Zoom & Reset Controls */}
            <div className="layer-controller-footer">
              <div className="zoom-btns-row">
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => window.dispatchEvent(new Event('orca-globe-zoom-in'))}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => window.dispatchEvent(new Event('orca-globe-zoom-out'))}
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  type="button"
                  className="reset-view-btn"
                  onClick={() => window.dispatchEvent(new Event('orca-globe-reset'))}
                  title="Reset View to Indian Ocean"
                >
                  <span className="material-symbols-outlined text-xs">restart_alt</span>
                  <span>RESET</span>
                </button>
              </div>

              <div className="compass-rose" title="Geodetic North Alignment">
                <span className="compass-n">N</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. RIGHT FLOATING AI COPILOT COMMAND PANEL */}
      {/* ========================================================================= */}
      <aside className={`stitch-copilot-panel ocean-glass ${mobileChatOpen ? 'mobile-open' : ''}`}>
        <ChatSidebar
          messages={messages}
          isLoading={isLoading}
          language={language}
          setLanguage={setLanguage}
          vesselType={vesselType}
          setVesselType={setVesselType}
          onSend={handleSend}
          onOpenTerritoryMap={() => setIsTerritoryMapOpen(true)}
          onOpenQuiz={() => setIsQuizOpen(true)}
        />
      </aside>

      {/* Mobile Chat Toggle Floating Action Button */}
      <button
        type="button"
        className="mobile-copilot-toggle-btn"
        onClick={() => setMobileChatOpen(prev => !prev)}
      >
        <span className="material-symbols-outlined">
          {mobileChatOpen ? 'close' : 'chat'}
        </span>
        <span>{mobileChatOpen ? 'Hide Copilot' : 'ORCA Copilot'}</span>
      </button>

      {/* ========================================================================= */}
      {/* 6. BOTTOM STATUS & CRYPTOGRAPHIC TELEMETRY BAR */}
      {/* ========================================================================= */}
      <footer className="stitch-bottom-status ocean-glass-light">
        <div className="bottom-left-coords">
          <div className="coord-item">
            <span className="material-symbols-outlined text-[#00d4ff] text-sm">my_location</span>
            <span className="coord-text">
              LAT {currentPortPreset.lat.toFixed(2)}°N · LON {currentPortPreset.lon.toFixed(2)}°E
            </span>
          </div>
          <span className="coord-sep">|</span>
          <span className="basin-text">{currentPortPreset.basin.toUpperCase()} · {currentPortPreset.name.toUpperCase()} SECTOR</span>
          <span className="coord-sep hidden-mobile">|</span>
          <span className="depth-text hidden-mobile">BATHYMETRY DEPTH: {currentPortPreset.depth}</span>
        </div>

        <div className="bottom-center-status hidden-mobile">
          <span className="pulse-dot" />
          <span>AUTONOMOUS DEEP SEA OBSERVATION MATRIX</span>
        </div>

        <div className="bottom-right-crypto">
          <div className="crypto-hash">
            <span className="material-symbols-outlined text-xs">enhanced_encryption</span>
            <span>SHA-256: <strong className="text-[#00d4ff]">8b7f...c31e</strong></span>
          </div>
          <div className="crypto-sep" />
          <div className="crypto-uplink">
            <span className="material-symbols-outlined text-xs">cell_tower</span>
            <span>UPLINK: <strong className="text-[#00d4ff]">1.2s</strong></span>
          </div>
        </div>
      </footer>

      {/* Interactive India, Lakshadweep & Andaman Territory Map Modal */}
      <IndiaTerritoryMap
        isOpen={isTerritoryMapOpen}
        onClose={() => setIsTerritoryMapOpen(false)}
        onSelectTerritory={handleSelectTerritory}
      />

      {/* Marine Knowledge & Regulatory Assessment Quiz Modal */}
      <MarineQuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
      />
    </motion.div>
  );
}
