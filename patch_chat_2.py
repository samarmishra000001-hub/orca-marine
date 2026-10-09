with open('frontend/src/components/ChatMessage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_btn_lines = '''          <div className="message-actions" style={{ marginTop: '8px' }}>
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
          </div>'''

new_lines = lines[:96] + [l + '\n' for l in new_btn_lines.split('\n')] + lines[114:]

with open('frontend/src/components/ChatMessage.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
