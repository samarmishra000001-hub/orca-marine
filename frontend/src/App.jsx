import React, { useState, useCallback, useEffect, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from './components/ChatSidebar';
import MapView from './components/MapView';
import IndiaTerritoryMap from './components/IndiaTerritoryMap';
import MarineQuizModal from './components/MarineQuizModal';

const IntroScene = lazy(() => import('./components/IntroScene'));

const COASTAL_PRESETS = [
  { name: 'Mumbai', lat: 18.92, lon: 72.82 },
  { name: 'Kochi', lat: 9.93, lon: 76.26 },
  { name: 'Chennai', lat: 13.08, lon: 80.27 },
  { name: 'Visakhapatnam', lat: 17.68, lon: 83.21 },
  { name: 'Port Blair', lat: 11.66, lon: 92.74 },
  { name: 'Lakshadweep', lat: 10.57, lon: 72.64 },
  { name: 'Veraval', lat: 20.90, lon: 70.37 },
  { name: 'Paradip', lat: 20.31, lon: 86.61 },
];

const FORECAST_TIMELINE = [
  { id: 'now', label: 'Now (Live)', hours: 0, badge: 'LIVE' },
  { id: '+3h', label: '+3h', hours: 3, badge: 'FORECAST' },
  { id: '+6h', label: '+6h', hours: 6, badge: 'FORECAST' },
  { id: '+12h', label: '+12h', hours: 12, badge: 'FORECAST' },
  { id: '+24h', label: '+24h', hours: 24, badge: 'FORECAST' },
  { id: '+48h', label: '+48h', hours: 48, badge: 'OUTLOOK' },
];

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [vesselType, setVesselType] = useState('motorized_boat');
  const [isTerritoryMapOpen, setIsTerritoryMapOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [activePort, setActivePort] = useState('Mumbai');
  const [activeForecastStep, setActiveForecastStep] = useState('now');
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([72.82, 18.92]);
  const [mapZoom, setMapZoom] = useState(6.5);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [telemetry, setTelemetry] = useState({
    location: "Mumbai Coastal Sector",
    sea_state: "Calm / Slight",
    wave_height_m: 0.8,
    wind_speed_kmh: 14.2,
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
      
      // Try direct API or Vercel proxy
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

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to ORCA (ISRO SIH26176)! 🐋 I am your collaborative Marine Intelligence Swarm and General-Purpose Assistant. I synthesize real-time ocean forecasts from Open-Meteo, satellite telemetry, tide harmonics, and maritime boundaries into explainable decisions. Ask me anything about oceanography, coding, general science, or pick an Indian coastal port!',
      timestamp: new Date()
    }
  ]);
  const [layers, setLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }, []);

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
    if (showIntro) dismissIntro();

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
  }, [language, showIntro, messages, vesselType, activePort, apiBase, dismissIntro]);

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

  const alertClass = telemetry?.alert_level 
    ? `alert-${telemetry.alert_level.toLowerCase()}` 
    : 'alert-normal';

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        {showIntro && (
          <React.Suspense fallback={<div className="splash-screen" style={{ background: '#071D29' }}>Loading ORCA Observatory...</div>}>
            <IntroScene onFinish={dismissIntro} />
          </React.Suspense>
        )}
      </AnimatePresence>

      {!showIntro && (
        <>
          <motion.main 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.8, ease: 'circOut', delay: 0.1 }} 
            className="main-content"
          >
            {/* Top Navigation & Location Search Bar */}
            <div className="observatory-nav-header">
              <div className="brand-badge">
                <span className="brand-dot"></span>
                <span className="brand-title">ORCA OBSERVATORY</span>
                <span className="brand-sub">ISRO SIH26176</span>
              </div>

              {/* Coastal Sector Quick Selectors */}
              <div className="coastal-port-pills">
                {COASTAL_PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    className={`port-pill ${activePort === p.name ? 'active' : ''}`}
                    onClick={() => handleSelectPresetPort(p)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Search Form */}
              <form className="location-search-form" onSubmit={handleSearchLocationSubmit}>
                <input
                  type="text"
                  placeholder="Search port / coordinates..."
                  value={searchLocationQuery}
                  onChange={(e) => setSearchLocationQuery(e.target.value)}
                  className="location-search-input"
                />
                <button type="submit" className="location-search-submit">Search</button>
              </form>
            </div>

            {/* Coastal Telemetry Live Ribbon */}
            {telemetry && (
              <div className="coastal-telemetry-banner">
                <div className="telemetry-item">
                  <span className="telemetry-label">Coastal Sector</span>
                  <span className="telemetry-value">{telemetry.location}</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Sea State</span>
                  <span className="telemetry-value">{telemetry.sea_state}</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Significant Wave</span>
                  <span className="telemetry-value">{telemetry.wave_height_m}m</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Wind Velocity</span>
                  <span className="telemetry-value">{telemetry.wind_speed_kmh} km/h</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Tide & Forecast</span>
                  <span className="telemetry-value">{telemetry.tide_summary}</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Threat Level</span>
                  <span className={`alert-badge ${alertClass}`}>
                    {telemetry.alert_level || 'NORMAL'}
                  </span>
                </div>
                <button 
                  type="button" 
                  className="telemetry-refresh-btn"
                  onClick={() => fetchDashboardData(mapCenter[1], mapCenter[0])}
                  title="Refresh Live Data"
                >
                  ↻ Refresh
                </button>
              </div>
            )}

            {/* Compact Forecast Timeline Bar */}
            <div className="forecast-timeline-bar">
              <span className="timeline-title">FORECAST TIMELINE:</span>
              <div className="timeline-steps">
                {FORECAST_TIMELINE.map(step => (
                  <button
                    key={step.id}
                    type="button"
                    className={`timeline-step-btn ${activeForecastStep === step.id ? 'active' : ''}`}
                    onClick={() => handleForecastStepChange(step)}
                  >
                    <span>{step.label}</span>
                    <span className="step-badge">{step.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Floating Quick-Access Tools */}
            <div className="map-floating-actions">
              <button 
                type="button" 
                className="floating-action-btn territory-btn"
                onClick={() => setIsTerritoryMapOpen(true)}
                title="Open India, Lakshadweep & Andaman Map"
              >
                Territory Map
              </button>
              <button 
                type="button" 
                className="floating-action-btn quiz-btn"
                onClick={() => setIsQuizOpen(true)}
                title="Open Marine Practice Quiz"
              >
                Practice Quiz
              </button>
            </div>

            {/* Dominant MapLibre Globe View */}
            <MapView layers={layers} centerCoords={mapCenter} zoom={mapZoom} />

            {/* Mobile Bottom-Sheet Toggle Button */}
            <button 
              type="button" 
              className="mobile-drawer-toggle-btn"
              onClick={() => setMobileDrawerOpen(prev => !prev)}
            >
              💬 {mobileDrawerOpen ? 'Close Inspector' : 'Open Inspector & Chat'}
            </button>
          </motion.main>

          {/* Right-Side Marine Inspector & Chat Panel */}
          <motion.div 
            initial={{ x: 300, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            transition={{ duration: 0.5, ease: 'circOut' }} 
            className={`motion-sidebar-wrapper ${mobileDrawerOpen ? 'mobile-drawer-open' : ''}`}
          >
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
          </motion.div>

          {/* Interactive India, Lakshadweep & Andaman Territory Map */}
          <IndiaTerritoryMap
            isOpen={isTerritoryMapOpen}
            onClose={() => setIsTerritoryMapOpen(false)}
            onSelectTerritory={handleSelectTerritory}
          />

          {/* Marine Knowledge & Regulatory Assessment Quiz */}
          <MarineQuizModal
            isOpen={isQuizOpen}
            onClose={() => setIsQuizOpen(false)}
          />
        </>
      )}
    </div>
  );
}
