import { useState, useRef } from 'react';
import AgentReasoning from './AgentReasoning';
import ChartRenderer from './Charts/ChartRenderer';
import RiskIndicator from './Dashboard/RiskIndicator';
import SourceBadge from './Dashboard/SourceBadge';
import { useSpeech } from '../hooks/useSpeech';

export default function ChatMessage({ message, language = 'en' }) {
  const { role, content, reasoning, timestamp, charts = [], risk_assessment, citations = [] } = message;
  const isUser = role === 'user';
  const { speak } = useSpeech(language);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef(null);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const params = new URLSearchParams({
        text: content,
        language: language || 'en'
      });

      const audio = new Audio(`/api/tts?${params.toString()}`);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoadingAudio(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        console.warn("Backend TTS failed, falling back to browser speech synthesis");
        setIsLoadingAudio(false);
        setIsPlaying(false);
        speak(content, language);
      };

      await audio.play();
    } catch (e) {
      console.warn("Audio playback error, using fallback:", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      speak(content, language);
    }
  };

  // Enhanced Markdown Formatter
  const renderFormattedLine = (line, index) => {
    if (!line) return <div key={index} style={{ height: '0.6em' }} />;

    // Headers (###, ##, #)
    if (line.startsWith('### ')) {
      return <h4 key={index} className="chat-md-h3">{formatInline(line.slice(4))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={index} className="chat-md-h2">{formatInline(line.slice(3))}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={index} className="chat-md-h1">{formatInline(line.slice(2))}</h2>;
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <div key={index} className="chat-md-bullet">
          <span className="bullet-dot">•</span>
          <span>{formatInline(line.trim().slice(2))}</span>
        </div>
      );
    }

    return (
      <div key={index} className="chat-md-line">
        {formatInline(line)}
      </div>
    );
  };

  const formatInline = (text) => {
    if (!text) return '';
    // Format bold (**...**) and inline code (`...`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="inline-code-badge">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-bubble">
        {/* Render text content */}
        <div className="message-content-flow">
          {content.split('\n').map((line, i) => renderFormattedLine(line, i))}
        </div>

        {/* Structured Risk Assessment Indicator */}
        {risk_assessment && (
          <RiskIndicator assessment={risk_assessment} />
        )}

        {/* Structured SVG Charts */}
        {charts && charts.length > 0 && (
          <div className="message-charts-stack">
            {charts.map((chart, idx) => (
              <ChartRenderer key={idx} chart={chart} />
            ))}
          </div>
        )}

        {/* Multi-Agent Reasoning Trace */}
        {reasoning && reasoning.length > 0 && (
          <AgentReasoning steps={reasoning} />
        )}

        {/* Data Source Citations */}
        {citations && citations.length > 0 && (
          <SourceBadge citations={citations} />
        )}

        {/* Audio Action Trigger */}
        {!isUser && content && (
          <div className="message-actions" style={{ marginTop: '8px' }}>
            <button
              onClick={handleTogglePlay}
              title={isPlaying ? "Stop audio" : "Listen to response"}
              type="button"
              disabled={isLoadingAudio}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                color: isPlaying ? '#D97706' : '#718277', 
                display: 'flex', 
                alignItems: 'center',
                padding: '4px',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isLoadingAudio ? 'hourglass_top' : isPlaying ? 'stop_circle' : 'volume_up'}
              </span>
            </button>
          </div>
        )}
      </div>
      <div className="message-time">{formattedTime}</div>
    </div>
  );
}
