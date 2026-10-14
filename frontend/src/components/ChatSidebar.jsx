import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import VoiceButton from './VoiceButton';

const PERSONA_SCENARIOS = {
  fisher: [
    { label: "🎣 Safe sea today?", query: "Is it safe to venture into the sea today?" },
    { label: "🐟 Nearest PFZ Spot", query: "Where is the nearest Potential Fishing Zone today?" },
    { label: "🌅 Tomorrow Morning", query: "Is it safe to venture into the sea tomorrow morning?" },
    { label: "🌊 Swell & Tides", query: "What are the tide, weather, and sea conditions near my fishing location?" },
    { label: "⚡ Squall Alerts", query: "Are there any lightning or cyclone alerts in my area?" },
    { label: "🐟 Mackerel & Tuna", query: "Which regions show high chlorophyll concentration and favourable sea surface temperature for mackerel and tuna?" },
    { label: "🏠 Safest Route Home", query: "What is the safest route for a fishing vessel considering weather and sea-state conditions?" },
    { label: "📉 Fish Catch Decline", query: "Why has fish productivity declined in a particular coastal region?" },
    { label: "🚫 Avoid Restricted MPAs", query: "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?" },
    { label: "🏝️ Lakshadweep Tuna", query: "Show Potential Fishing Zones, weather, and safe routes near Lakshadweep Islands" }
  ],
  coast_guard: [
    { label: "🛡️ Sector Threat Assessment", query: "Provide full coastal sector threat assessment, swell heights, and maritime patrol window." },
    { label: "🚨 IMBL Border Proximity", query: "Audit active vessel tracks approaching the International Maritime Boundary Line." },
    { label: "🚁 SAR Operational Window", query: "What are the current wind, wave, and drift vector conditions for Search and Rescue (SAR) operations?" },
    { label: "🌀 Cyclone & Squall Track", query: "Track active cyclonic disturbances and squall warning zones in Indian basins." },
    { label: "🛑 MPA Geofence Breaches", query: "Are any unauthorized mechanized trawlers reported inside Marine Protected Areas?" },
    { label: "🚑 Emergency Intercept Route", query: "Compute high-speed emergency navigation route avoiding shallow sandbars and shoals." },
    { label: "⚓ Harbor Storm Signals", query: "What are the active port storm warning signals along the coastline?" }
  ],
  researcher: [
    { label: "🌡️ SST Thermal Anomalies", query: "Which regions show sea surface temperature anomalies and coral bleaching thermal fronts?" },
    { label: "🌿 Chlorophyll-a Plumes", query: "Display chlorophyll-a primary productivity gradients and pelagic upwelling zones." },
    { label: "🏛️ MPA Ecosystem Rules", query: "List all Marine Protected Areas and Wildlife Protection Act Schedule I conservation rules." },
    { label: "🧬 Biodiversity Corridors", query: "What are the documented species migration corridors for Olive Ridley turtles and dugongs?" },
    { label: "📉 Marine Heatwave Impact", query: "Analyze the oceanographic and ecological drivers of fishery decline on the continental shelf." },
    { label: "🌊 Ekman Upwelling Index", query: "Evaluate alongshore wind stress and Ekman mass transport along western and eastern coasts." }
  ]
};

export default function ChatSidebar({ 
  messages, 
  isLoading, 
  language, 
  setLanguage, 
  vesselType = 'motorized_boat', 
  setVesselType, 
  onSend,
  onOpenTerritoryMap,
  onOpenQuiz,
  userPersona = 'fisher',
  probedCoordinate = null
}) {
  const [inputText, setInputText] = useState('');
  const messagesContainerRef = useRef(null);

  const personaScenarios = PERSONA_SCENARIOS[userPersona] || PERSONA_SCENARIOS.fisher;

  // Dynamic Contextual Smart Chips if map coordinate was probed
  const contextualChips = [];
  if (probedCoordinate) {
    const latStr = `${probedCoordinate.lat.toFixed(2)}°N`;
    const lonStr = `${probedCoordinate.lon.toFixed(2)}°E`;
    if (userPersona === 'fisher') {
      contextualChips.push({
        label: `🚤 Safe boat here? (${latStr})`,
        query: `Is it safe for a small motorized boat at coordinates ${latStr}, ${lonStr} tomorrow?`
      });
      contextualChips.push({
        label: `🐟 Fish aggregation here?`,
        query: `Explain the fish aggregation and Potential Fishing Zone near ${latStr}, ${lonStr}.`
      });
      contextualChips.push({
        label: `🌐 Translate warning to Indic`,
        query: `Translate the weather and safety warning for ${latStr}, ${lonStr} into Tamil and Hindi.`
      });
    } else if (userPersona === 'coast_guard') {
      contextualChips.push({
        label: `🚨 IMBL distance from ${latStr}`,
        query: `What is the exact distance from ${latStr}, ${lonStr} to the International Maritime Boundary Line and nearest MPA?`
      });
      contextualChips.push({
        label: `🚁 SAR Drift Trajectory`,
        query: `Calculate Search and Rescue drift vectors for a disabled craft at ${latStr}, ${lonStr}.`
      });
    } else {
      contextualChips.push({
        label: `🔬 Coral & Thermal index here`,
        query: `Analyze SST anomalies, coral bleaching risk, and chlorophyll concentrations at ${latStr}, ${lonStr}.`
      });
      contextualChips.push({
        label: `🏛️ Sanctuary compliance check`,
        query: `What conservation regulations apply to marine waters at ${latStr}, ${lonStr}?`
      });
    }
  }

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      if (typeof messagesContainerRef.current.scrollTo === 'function') {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    onSend(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const personaBadgeColors = {
    fisher: { bg: 'rgba(0, 212, 255, 0.15)', text: '#00d4ff', label: '🎣 Fisher Mode' },
    coast_guard: { bg: 'rgba(230, 164, 72, 0.15)', text: '#E6A448', label: '⚓ Coast Guard Mode' },
    researcher: { bg: 'rgba(46, 204, 113, 0.15)', text: '#2ECC71', label: '🔬 Biologist Mode' }
  };
  const activeBadge = personaBadgeColors[userPersona] || personaBadgeColors.fisher;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo-area">
          <div className="title">ORCA Copilot</div>
          <div className="subtitle-persona-row">
            <span className="persona-mode-chip" style={{ background: activeBadge.bg, color: activeBadge.text }}>
              {activeBadge.label}
            </span>
            <span className="subtitle-subtext">Swarm Intelligence</span>
          </div>
        </div>
        <div className="header-controls">
          <select 
            className="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            title="Select Coastal Language for Speech & Translation"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="ml">മലയാളം (Malayalam)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
            <option value="mr">मराठी (Marathi)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="or">ଓଡ଼ିଆ (Odia)</option>
            <option value="gom">कोंकणी (Konkani)</option>
          </select>
          <select
            className="vessel-select"
            value={vesselType}
            onChange={(e) => setVesselType && setVesselType(e.target.value)}
            title="Select Craft Type for Hydrodynamic Risk Thresholds"
          >
            <option value="motorized_boat">Motorized Boat (Fiber/OBM)</option>
            <option value="traditional_vallam">Traditional Craft / Vallam</option>
            <option value="mechanized_trawler">Mechanized Deep-Sea Trawler</option>
          </select>
        </div>
      </div>

      {/* Territory & Quiz Quick Row */}
      <div className="sidebar-tools-row">
        <button
          type="button"
          className="sidebar-tool-btn"
          onClick={onOpenTerritoryMap}
          title="Interactive Map of India, Lakshadweep (SW) & Andaman & Nicobar (SE)"
        >
          <span className="material-symbols-outlined text-xs">hub</span>
          <span>India &amp; Islands</span>
        </button>
        <button
          type="button"
          className="sidebar-tool-btn"
          onClick={onOpenQuiz}
          title="Marine Knowledge &amp; Regulatory Practice Assessment"
        >
          <span className="material-symbols-outlined text-xs">school</span>
          <span>Practice Quiz</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} language={language} />
        ))}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Contextual Probe Chips (When coordinate dropped) */}
      {contextualChips.length > 0 && (
        <div className="contextual-chips-container">
          <div className="contextual-chips-label">
            <span className="material-symbols-outlined text-xs text-[#00d4ff]">pin_drop</span>
            <span>Contextual Prompts for Selected Point:</span>
          </div>
          <div className="quick-prompts">
            {contextualChips.map((chip, idx) => (
              <button
                key={`ctx-${idx}`}
                className="prompt-chip contextual-chip"
                onClick={() => onSend(chip.query)}
                disabled={isLoading}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Persona-Specific Scenarios */}
      <div className="quick-prompts-container">
        <div className="quick-prompts-label">
          {userPersona === 'fisher' && 'Fisher Operational Scenarios:'}
          {userPersona === 'coast_guard' && 'Coast Guard Tactical Operations:'}
          {userPersona === 'researcher' && 'Scientific Research Queries:'}
        </div>
        <div className="quick-prompts">
          {personaScenarios.map((item, idx) => (
            <button
              key={idx}
              className="prompt-chip"
              onClick={() => onSend(item.query)}
              disabled={isLoading}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            className="chat-input"
            placeholder={
              userPersona === 'fisher' ? "Ask about safe fishing, wave swell, tides, or port routes..." :
              userPersona === 'coast_guard' ? "Ask about IMBL clearances, SAR readiness, or cyclone tracks..." :
              "Ask about SST anomalies, chlorophyll plumes, or MPA regulations..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <VoiceButton 
            onTranscript={(text) => {
               if (text) {
                 setInputText((prev) => prev ? `${prev} ${text}` : text);
               }
            }} 
            language={language} 
          />
          <button 
            className="icon-btn send-btn" 
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            title="Send Message to Swarm"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
