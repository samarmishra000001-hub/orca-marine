import { useState, useCallback } from 'react';
import ChatSidebar from './components/ChatSidebar';
import MapView from './components/MapView';
import IndiaTerritoryMap from './components/IndiaTerritoryMap';
import MarineQuizModal from './components/MarineQuizModal';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [vesselType, setVesselType] = useState('motorized_boat');
  const [isTerritoryMapOpen, setIsTerritoryMapOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [telemetry, setTelemetry] = useState({
    location: "Indian Coastal Waters",
    sea_state: "State 3 (Slight / Moderate)",
    wave_height_m: 1.4,
    wind_speed_kmh: 18.5,
    tide_summary: "High Tide at 06:15 AM (2.8m)",
    alert_level: "NORMAL"
  });
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to ORCA (ISRO SIH26176)! 🐋 I am your collaborative Marine Intelligence Swarm. I synthesize satellite Earth Observation, ocean forecasts, tide harmonics, and maritime boundaries into explainable decisions. Try clicking one of the 8 ISRO Problem Scenarios below or ask in your regional language.',
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
      const apiBase = import.meta.env.VITE_API_URL || 'https://orca-marine-xu7i.onrender.com';
      // Send past 6 turns as conversation history for contextual multi-turn memory
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      })).slice(-6);

      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          location: 'auto',
          language: language,
          vessel_type: vesselType,
          conversation_history: historyPayload
        })
      });

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
        content: `Sorry, could not fetch marine data: ${err.message}. Please verify the backend is running.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [language, showIntro, messages, vesselType]);

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
      {/* Aesthetic Hero Modal Overlay (dismissible on click) */}
      {showIntro && (
        <div className="splash-screen" onClick={dismissIntro}>
          <div className="splash-content" onClick={(e) => e.stopPropagation()}>
            <div className="splash-logo">🐋</div>
            <div className="splash-tagline">ISRO SIH26176 · ORCA</div>
            <h1 className="splash-title">Marine Ecosystem Reasoning with Collaborative Agents</h1>
            <p className="splash-subtitle">
              Agentic AI decision-support platform for India's blue economy &amp; coastal communities.<br />
              Correlating Earth Observation (Oceansat-3, INSAT-3D) with multi-agent spatial-temporal reasoning.
            </p>
            <div className="splash-features">
              <div className="splash-feature"><span>🎣</span><span>Potential Fishing Zones</span></div>
              <div className="splash-feature"><span>⚡</span><span>Cyclone &amp; Lightning</span></div>
              <div className="splash-feature"><span>🌊</span><span>Tides &amp; Sea State</span></div>
              <div className="splash-feature"><span>🛡️</span><span>MPA &amp; IMBL Geofencing</span></div>
              <div className="splash-feature"><span>🗣️</span><span>11 Indian Languages</span></div>
            </div>
            <button className="splash-btn" onClick={dismissIntro} type="button">
              🚀 Explore Marine Swarm Map
            </button>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }} onClick={dismissIntro}>
              (Click anywhere to start)
            </div>
          </div>
        </div>
      )}

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

      <main className="main-content">
        {/* Coastal Telemetry Live Ribbon */}
        {telemetry && (
          <div className="coastal-telemetry-banner">
            <div className="telemetry-item">
              <span className="telemetry-label">📍 Coastal Sector</span>
              <span className="telemetry-value">{telemetry.location}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">🌊 Sea State</span>
              <span className="telemetry-value">{telemetry.sea_state}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">〰️ Significant Wave</span>
              <span className="telemetry-value">{telemetry.wave_height_m}m</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">💨 Wind Velocity</span>
              <span className="telemetry-value">{telemetry.wind_speed_kmh} km/h</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">🕒 Tide Schedule</span>
              <span className="telemetry-value">{telemetry.tide_summary}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">⚠️ Threat Level</span>
              <span className={`alert-badge ${alertClass}`}>
                {telemetry.alert_level || 'NORMAL'}
              </span>
            </div>
          </div>
        )}

        {/* Floating Quick-Access Tools */}
        <div className="map-floating-actions">
          <button 
            type="button" 
            className="floating-action-btn"
            onClick={async () => {
              const apiBase = import.meta.env.VITE_API_URL || 'https://orca-marine-xu7i.onrender.com';
              try {
                const res = await fetch(`${apiBase}/api/ocean/sst`);
                const data = await res.json();
                setLayers(prev => {
                  const filtered = prev.filter(l => l.id !== 'isro-sst');
                  return [...filtered, {
                    id: 'isro-sst',
                    type: 'circle',
                    label: '📡 Live ISRO SST (MOSDAC)',
                    data: data,
                    style: { color: '#E74C3C', width: 6, opacity: 0.8 }
                  }];
                });
              } catch(e) { console.error(e); }
            }}
            title="Load Live Sea Surface Temperature from MOSDAC"
            style={{background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #E74C3C'}}
          >
            🌡️ Live ISRO SST
          </button>
          
          <button 
            type="button" 
            className="floating-action-btn"
            onClick={async () => {
              const apiBase = import.meta.env.VITE_API_URL || 'https://orca-marine-xu7i.onrender.com';
              try {
                const res = await fetch(`${apiBase}/api/ocean/pfz`);
                const data = await res.json();
                setLayers(prev => {
                  const filtered = prev.filter(l => l.id !== 'isro-pfz');
                  return [...filtered, {
                    id: 'isro-pfz',
                    type: 'fill',
                    label: '🐟 Live ISRO PFZ (Bhuvan)',
                    data: data,
                    style: { color: '#2ECC71', opacity: 0.6, width: 2 }
                  }];
                });
              } catch(e) { console.error(e); }
            }}
            title="Load Live Potential Fishing Zones from Bhuvan"
            style={{background: 'rgba(46, 204, 113, 0.2)', border: '1px solid #2ECC71'}}
          >
            🎣 Live ISRO PFZ
          </button>

          <button 
            type="button" 
            className="floating-action-btn territory-btn"
            onClick={() => setIsTerritoryMapOpen(true)}
            title="Open India, Lakshadweep & Andaman Map"
          >
            🗺️ India & Island Territories
          </button>
          <button 
            type="button" 
            className="floating-action-btn quiz-btn"
            onClick={() => setIsQuizOpen(true)}
            title="Open Marine Practice Quiz"
          >
            📚 Practice Quiz
          </button>
        </div>

        <MapView layers={layers} />
      </main>

      {/* Interactive India, Lakshadweep (SW) & Andaman & Nicobar (SE) Territory Map */}
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
    </div>
  );
}
