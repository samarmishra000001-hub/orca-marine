import { useState, useCallback, useRef, useEffect } from 'react';
import MapView from './components/MapView';
import ChatMessage from './components/ChatMessage';
import VoiceButton from './components/VoiceButton';

const QUICK_PROMPTS = [
  { label: "🐟 Fishing in Kochi", query: "Show potential fishing zones near Kochi" },
  { label: "🌊 Weather in Mumbai", query: "What are the ocean weather and wave conditions off Mumbai?" },
  { label: "⚠️ Risk at Rameswaram", query: "Check safety risk and IMBL boundary near Rameswaram" },
  { label: "🗺️ Route Vizag to Chennai", query: "Compute a safe navigation route from Vizag to Chennai" }
];

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to ORCA Marine Intelligence! 🐋 Live telemetry active. Ask about real-time fishing zones (PFZ), wave forecasts, safety risk, or safe routing along the Indian coast.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [layers, setLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [userRole, setUserRole] = useState('general');
  const [unitSystem, setUnitSystem] = useState('metric');
  const [isHearted, setIsHearted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Sync fullscreen state
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const savePreferences = async (role, lang, units) => {
    try {
      const sessionId = sessionStorage.getItem('orca_session_id');
      if (sessionId) {
        await fetch('/api/users/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, role, language: lang, unit_system: units })
        });
      }
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        let sessionId = sessionStorage.getItem('orca_session_id');
        if (!sessionId) {
          sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          sessionStorage.setItem('orca_session_id', sessionId);
        }
        const res = await fetch(`/api/users/preferences/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.role) setUserRole(data.role);
          if (data.language) setLanguage(data.language);
          if (data.unit_system) setUnitSystem(data.unit_system);
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    };
    loadPreferences();
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullScreen(false);
      }
    }
  };

  // Active Location Telemetry
  const [currentLocation, setCurrentLocation] = useState({
    name: 'Tamil Nadu Coast · Bay of Bengal',
    sector: 'INCOIS Zone 4',
    state: 'Tamil Nadu',
    advisory: 'Optimal Catch',
    vis: '14 NM',
    swell: '1.1m',
    temp: '29°C',
    pfz: 15,
    activeSkippers: 42
  });

  // Client-side cache for instantaneous response on common/repeated queries
  const responseCache = useRef(new Map());
  const chatBottomRef = useRef(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isChatOpen]);

  // Lightning-fast message handler
  const handleSend = useCallback(async (text) => {
    if (!text || !text.trim() || isLoading) return;
    const query = text.trim();

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsChatOpen(true);
    setInputText('');

    // Check fast client-side cache
    const cacheKey = `${language}:${query.toLowerCase()}`;
    if (responseCache.current.has(cacheKey)) {
      const cached = responseCache.current.get(cacheKey);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: cached.text_response,
        reasoning: cached.agent_reasoning,
        layers: cached.geojson_layers,
        timestamp: new Date()
      }]);
      if (cached.geojson_layers?.length > 0) {
        setLayers(cached.geojson_layers);
      }
      return;
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Persist or retrieve persistent session_id
      let sessionId = sessionStorage.getItem('orca_session_id');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('orca_session_id', sessionId);
      }

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          location: currentLocation.name ? currentLocation.name : (currentLocation.state ? currentLocation.state : 'auto'),
          latitude: currentLocation.lat || null,
          longitude: currentLocation.lon || null,
          language: language,
          session_id: sessionId,
          user_role: userRole
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let completeResponse = {
          text_response: "",
          agent_reasoning: [],
          geojson_layers: [],
          charts: [],
          risk_assessment: null,
          citations: []
        };
        
        // Push an empty assistant message to update
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '',
          reasoning: [],
          layers: [],
          charts: [],
          risk_assessment: null,
          citations: [],
          timestamp: new Date()
        }]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'token') {
                  completeResponse.text_response += parsed.content;
                } else if (parsed.type === 'step') {
                  completeResponse.agent_reasoning.push(parsed.data);
                } else if (parsed.type === 'complete') {
                  if (parsed.data.geojson_layers) completeResponse.geojson_layers = parsed.data.geojson_layers;
                  if (parsed.data.charts) completeResponse.charts = parsed.data.charts;
                  if (parsed.data.risk_assessment) completeResponse.risk_assessment = parsed.data.risk_assessment;
                  if (parsed.data.citations) completeResponse.citations = parsed.data.citations;
                  
                  // Store in fast cache once complete
                  responseCache.current.set(cacheKey, parsed.data);
                  if (parsed.data.geojson_layers && parsed.data.geojson_layers.length > 0) {
                    setLayers(parsed.data.geojson_layers);
                  }
                }
                
                // Update UI state for stream
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  const lastIdx = newMsgs.length - 1;
                  newMsgs[lastIdx] = {
                    ...newMsgs[lastIdx],
                    content: completeResponse.text_response,
                    reasoning: completeResponse.agent_reasoning,
                    layers: completeResponse.geojson_layers,
                    charts: completeResponse.charts,
                    risk_assessment: completeResponse.risk_assessment,
                    citations: completeResponse.citations
                  };
                  return newMsgs;
                });
              } catch (e) {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      } else {
        // Fallback for non-streaming JSON
        const data = await res.json();
        responseCache.current.set(cacheKey, data);
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.text_response,
          reasoning: data.agent_reasoning,
          layers: data.geojson_layers,
          charts: data.charts || [],
          risk_assessment: data.risk_assessment || null,
          citations: data.citations || [],
          timestamp: new Date()
        }]);

        if (data.geojson_layers && data.geojson_layers.length > 0) {
          setLayers(data.geojson_layers);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Could not retrieve marine intelligence: ${err.message}. Please verify the backend service is running.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [language, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const handleLocationSelect = (preset) => {
    setCurrentLocation({
      name: `${preset.state} Shelf`,
      sector: preset.name,
      state: preset.state,
      advisory: preset.advisory || 'Optimal Catch',
      lat: preset.coords[1],
      lon: preset.coords[0],
      vis: preset.vis || '14 NM',
      swell: preset.swell || '1.1m',
      temp: preset.temp || '29°C',
      pfz: preset.pfz || 15,
      activeSkippers: Math.floor(Math.random() * 20) + 30
    });
  };

  return (
    <div className="app-viewport">
      {/* LEFT VERTICAL FLOATING DOCK RAIL */}
      <aside className="dock-rail" aria-label="Tactical Navigation Dock">
        <div className="dock-cluster">
          {/* ORCA Emblem */}
          <div className="dock-emblem" title="ORCA Marine Command">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>waves</span>
            <span className="dock-status-dot" />
          </div>

          <div className="dock-divider" />

          {/* Active Home / Radar Button */}
          <button className="dock-btn active" title="Fleet Domain Overview" type="button">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>radar</span>
          </button>

          {/* Quick Query / Add Waypoint */}
          <button 
            className="dock-btn" 
            title="Deploy Buoy / Quick Advisory" 
            onClick={() => handleSend("Fishing zones near Tamil Nadu")}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>add</span>
          </button>

          {/* Nautical Logs */}
          <button 
            className="dock-btn" 
            title="Marine Advisory Log" 
            onClick={() => handleSend("Show marine weather alerts and wave heights")}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
          </button>

          {/* Chat Toggle Button (with notification badge dot) */}
          <button 
            className={`dock-btn ${isChatOpen ? 'active' : ''}`}
            onClick={() => setIsChatOpen(!isChatOpen)}
            title="Toggle ORCA AI Chatbot" 
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat_bubble</span>
            <span className="dock-notification-dot" />
          </button>

          {/* Oceanographic Contour Layers */}
          <button 
            className="dock-btn" 
            title="Thermal & Chlorophyll Layers" 
            onClick={() => handleSend("Sea surface temperature Tamil Nadu")}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>layers</span>
          </button>

          {/* Knowledge Base */}
          <button 
            className="dock-btn" 
            title="Upload Operational Manuals (Knowledge Base)" 
            onClick={() => setIsKnowledgeBaseOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>library_books</span>
          </button>

          {/* Compass / Safe Route Planning */}
          <button 
            className="dock-btn" 
            title="Safe Nautical Routing" 
            onClick={() => handleSend("Route Chennai to Kanyakumari")}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>explore</span>
          </button>

          {/* Fullscreen Toggle Button in Rail */}
          <button 
            className={`dock-btn ${isFullScreen ? 'active' : ''}`}
            title={isFullScreen ? "Exit Fullscreen (Esc)" : "Fullscreen Mode"}
            onClick={toggleFullScreen}
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>

        {/* Bottom Avatar / Navigator Badge */}
        <div className="dock-avatar" title="Chief Operational Navigator">
          OC
        </div>
      </aside>

      {/* MAIN DASHBOARD CONTENT BODY */}
      <main className="dashboard-body">
        {/* TOP SECTION: INTERACTIVE OCEAN MAP CONTAINER */}
        <MapView 
          layers={layers}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onLocationSelect={handleLocationSelect}
          onMapClickCoordinates={(lat, lon) => {
            setCurrentLocation(prev => ({
              ...prev,
              name: `Pinned Coordinates (${lat}°N, ${lon}°E)`,
              sector: 'Custom Point',
              lat: lat,
              lon: lon
            }));
            handleSend(`Analyze marine conditions at coordinates ${lat}°N, ${lon}°E`);
          }}
          onTriggerZoneQuery={(zoneType, preset) => {
            if (zoneType === 'PFZ') {
              handleSend(`Show potential fishing grounds near ${preset.name}`);
            } else if (zoneType === 'SST') {
              handleSend(`Sea surface temperature and thermal fronts near ${preset.name}`);
            } else if (zoneType === 'Hazard') {
              handleSend(`Wave and storm hazards near ${preset.name}`);
            }
          }}
          isMapExpanded={isMapExpanded}
          onToggleExpandMap={() => setIsMapExpanded(!isMapExpanded)}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
        />

        {/* BOTTOM ROW (3 CARDS GRID) */}
        <section className={`bottom-cards-grid ${isMapExpanded ? 'hidden-cards' : ''}`} aria-label="Operational Telemetry Cards">
          {/* CARD 1: LOCATION & OCEAN ADVISORY (LEFT) */}
          <article className="card-location">
            <div>
              <div className="card-header-row">
                <div>
                  <h2 className="card-title">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#54625a' }}>pin_drop</span>
                    Location
                  </h2>
                  <p className="card-subtitle">
                    {currentLocation.name} · {currentLocation.sector}
                  </p>
                </div>
                {/* Heart bookmark button */}
                <button 
                  className="heart-bookmark-btn" 
                  onClick={() => setIsHearted(!isHearted)} 
                  title="Bookmark Sector"
                  type="button"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isHearted ? '#dc2626' : '#F59E0B' }}>
                    {isHearted ? 'favorite' : 'favorite_border'}
                  </span>
                </button>
              </div>

              {/* Date / Live Tag */}
              <div className="date-pill">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_today</span>
                <span>31 Jan 2026 · Live Telemetry</span>
              </div>
            </div>

            {/* 3 Metric Sub-Cards */}
            <div className="metric-subcards-stack">
              <div className="metric-subcard">
                <div className="subcard-top">
                  <span className="subcard-label">Fleet Advisory</span>
                  <span className="subcard-tag">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    {currentLocation.advisory}
                  </span>
                </div>
                <p className="subcard-val">High density pelagic schools detected</p>
              </div>

              <div className="metric-subcard">
                <div className="subcard-top">
                  <span className="subcard-label">Visibility &amp; Waves</span>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#121714' }}>Favorable Sea</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="subcard-val-big">{currentLocation.vis}</span>
                  <span style={{ color: '#718277' }}>·</span>
                  <span className="subcard-val-big">{currentLocation.swell}</span>
                  <span style={{ fontSize: '11.5px', color: '#718277' }}>swell height</span>
                </div>
              </div>

              <div className="metric-subcard">
                <div className="subcard-top">
                  <span className="subcard-label">Sea Temperature</span>
                  <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#D97706' }}>
                    {currentLocation.temp}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#718277' }}>Chlorophyll bloom active · Salinity 34.2 PSU</p>
              </div>
            </div>
          </article>

          {/* CARD 2: COASTAL VISUAL TELEMETRY PHOTO (MIDDLE) */}
          <article className="card-visual-telemetry">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFnNmJfA5Pfh1LZqfVGIlkSfcOurbL_fqPEI5fTlAKiQqZO-77LxsJ5C6QFmdVDXJf7CbuXtsxA5hr6vRmHjEtMvxAZN8gk7AVBU3K1YWjK7GNBNj3iXtncABOtOgFZvvxD0juzhKLKu-cueJTfVOQLNxOIsJDbnKq9GlopfeB1Hz75gfzFp7W4QFK8janbmpW8t-sTeZVdRmvmbscI07a1pBmupQfyDo6Mybd-dE65Jstq11pxt1xSqtUVPsV3t9U5idTHAzQCg0" 
              alt="Aerial satellite and coastal radar view of deep ocean turquoise waters with fishing trawler vessels" 
              className="telemetry-img-cover"
            />
            <div className="telemetry-scrim" />

            <div className="telemetry-overlay-top">
              <div className="telemetry-radar-pill">
                <span className="radar-blip" />
                <span>Live Vessel Telemetry · Aerial Radar</span>
              </div>
              <div className="telemetry-sensor-btn" title="Sentinel-3 Optical Radar">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>satellite_alt</span>
              </div>
            </div>

            <div className="telemetry-overlay-bottom">
              <div className="telemetry-vessel-badge">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#54625a' }}>directions_boat</span>
                  <span>2 Trawlers Active</span>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', background: '#F1F5F9', padding: '2px 8px', borderRadius: '9999px', color: '#334155' }}>
                  Safe Anchorage
                </span>
              </div>
            </div>
          </article>

          {/* CARD 3: ACTIVE FLEET & CATCH POTENTIAL (RIGHT) */}
          <article className="card-fleet-gauge">
            <div>
              <div className="card-header-row">
                <div>
                  <h2 className="card-title">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#F59E0B' }}>trending_up</span>
                    Active Fleet &amp; Catch Potential
                  </h2>
                  <p className="card-subtitle">
                    Join our growing community of active coastal fishermen
                  </p>
                </div>
              </div>

              {/* Avatar Stack */}
              <div className="avatar-stack-box">
                <div className="avatar-overlap-group">
                  <div className="avatar-badge-circle" style={{ background: '#54625a' }}>AK</div>
                  <div className="avatar-badge-circle" style={{ background: '#718277' }}>MN</div>
                  <div className="avatar-badge-circle" style={{ background: '#121714' }}>RV</div>
                  <div className="avatar-badge-circle" style={{ background: '#D97706' }}>SK</div>
                </div>
                <div style={{ fontSize: '11.5px' }}>
                  <strong style={{ color: '#121714' }}>+{currentLocation.activeSkippers} active skippers</strong>
                  <span style={{ color: '#718277', display: 'block' }}>online in sector grid</span>
                </div>
              </div>
            </div>

            {/* Semicircular Radial Arc Gauge */}
            <div className="gauge-visual-container">
              <svg width="190" height="105" viewBox="0 0 200 110">
                <defs>
                  <linearGradient id="amber-arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="60%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                </defs>
                {/* Background Track */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E2E8E4" strokeWidth="14" strokeLinecap="round" />
                {/* 94% Active Arc Track */}
                <path 
                  d="M 20 100 A 80 80 0 0 1 180 100" 
                  fill="none" 
                  stroke="url(#amber-arc-gradient)" 
                  strokeWidth="14" 
                  strokeLinecap="round" 
                  strokeDasharray="236 252" 
                  strokeDashoffset="0" 
                />
              </svg>

              <div className="gauge-center-reading">
                <span className="gauge-big-num">8.5k</span>
                <span className="gauge-num-sub">active vessels</span>
              </div>

              <div className="gauge-yield-pill">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                <span>94% Yield Arc</span>
              </div>
              <p style={{ fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#718277', textAlign: 'center', marginTop: '4px' }}>
                Real-time satellite acoustic synchronisation
              </p>
            </div>
          </article>
        </section>
      </main>

      {/* FLOATING AI CHATBOT DRAWER (SLIDES IN SMOOTHLY) */}
      {isChatOpen && (
        <div className="chat-drawer-overlay" onClick={() => setIsChatOpen(false)}>
          <div className="chat-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="chat-drawer-header">
              <div className="chat-drawer-title-area">
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#121714', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#121714' }}>ORCA AI Copilot</h3>
                  <p style={{ fontSize: '11px', color: '#718277' }}>Fast Marine Intelligence Swarm</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Role Selector */}
                <select 
                  value={userRole} 
                  onChange={(e) => {
                    setUserRole(e.target.value);
                    savePreferences(e.target.value, language, unitSystem);
                  }}
                  style={{ fontSize: '11.5px', border: '1px solid #cbd5e1', borderRadius: '9999px', padding: '4px 8px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="general">General</option>
                  <option value="fisherman">Fisherman</option>
                  <option value="researcher">Researcher</option>
                  <option value="coastal_authority">Coastal Authority</option>
                  <option value="disaster_officer">Disaster Officer</option>
                  <option value="maritime_operator">Maritime Operator</option>
                  <option value="student">Student</option>
                </select>

                {/* Units Selector */}
                <select 
                  value={unitSystem} 
                  onChange={(e) => {
                    setUnitSystem(e.target.value);
                    savePreferences(userRole, language, e.target.value);
                  }}
                  style={{ fontSize: '11.5px', border: '1px solid #cbd5e1', borderRadius: '9999px', padding: '4px 8px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="metric">Metric</option>
                  <option value="imperial">Imperial</option>
                </select>

                {/* Language Selector */}
                <select 
                  value={language} 
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    savePreferences(userRole, e.target.value, unitSystem);
                  }}
                  style={{ fontSize: '11.5px', border: '1px solid #cbd5e1', borderRadius: '9999px', padding: '4px 8px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="ta">தமிழ்</option>
                  <option value="te">తెలుగు</option>
                  <option value="kn">ಕನ್ನಡ</option>
                  <option value="ml">മലയാളം</option>
                  <option value="mr">मराठी</option>
                  <option value="gu">ગુજરાતી</option>
                  <option value="bn">বাংলা</option>
                </select>

                <button 
                  className="chat-drawer-close-btn" 
                  onClick={() => setIsChatOpen(false)}
                  title="Close Assistant"
                  type="button"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="chat-thread-container">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} language={language} />
              ))}
              {isLoading && (
                <div className="message-wrapper assistant">
                  <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#D97706', animation: 'spin 1s linear infinite' }}>sync</span>
                    <span style={{ fontSize: '12.5px', color: '#718277' }}>Synthesizing satellite &amp; coastal ocean intelligence...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompts Chips */}
            <div className="chat-quick-prompts">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  className="prompt-chip"
                  onClick={() => handleSend(item.query)}
                  disabled={isLoading}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Chat Input Row with Voice Input */}
            <div className="chat-input-row">
              <VoiceButton 
                language={language}
                onTranscript={(transcript) => handleSend(transcript)}
                disabled={isLoading}
              />
              <input 
                type="text" 
                className="chat-input-field"
                placeholder="Ask about fishing zones, safety, or routes..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button 
                className="chat-send-circle"
                onClick={() => handleSend(inputText)}
                disabled={isLoading || !inputText.trim()}
                title="Send query"
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KNOWLEDGE BASE MODAL */}
      {isKnowledgeBaseOpen && (
        <div className="chat-drawer-overlay" onClick={() => setIsKnowledgeBaseOpen(false)}>
          <div className="knowledge-base-modal" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '400px', padding: '24px', borderRadius: '16px', margin: 'auto', marginTop: '10vh', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button 
              onClick={() => setIsKnowledgeBaseOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#121714' }}>Operational Manuals</h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#718277' }}>Upload PDFs to the RAG knowledge base. The ORCA Swarm will reference these documents.</p>
            
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
              <input 
                type="file" 
                accept="application/pdf"
                id="kb-upload"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadStatus('Uploading and indexing...');
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await fetch('/api/knowledge/upload', {
                      method: 'POST',
                      body: formData
                    });
                    if (res.ok) {
                      setUploadStatus(`Successfully indexed: ${file.name}`);
                    } else {
                      setUploadStatus(`Upload failed: ${res.statusText}`);
                    }
                  } catch (err) {
                    setUploadStatus(`Error: ${err.message}`);
                  }
                }}
              />
              <label htmlFor="kb-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#64748b' }}>upload_file</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Select PDF Document</span>
              </label>
            </div>
            {uploadStatus && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#F1F5F9', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
