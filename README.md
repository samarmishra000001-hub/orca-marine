# 🐋 ORCA — Marine Ecosystem Reasoning with Collaborative Agents

> **ISRO Marine Intelligence Platform** — Multi-Agent Marine Intelligence Platform

A full-stack prototype that allows users to query oceanographic conditions, safety alerts, safe routing, and Potential Fishing Zones (PFZs) using natural language, returning structured explanations and interactive map overlays.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌────────────┐  ┌─────────────────────────────────────────────┐ │
│  │ Chat Panel  │  │           MapLibre GL Map                   │ │
│  │ Voice I/O   │  │  • PFZ zones (green)                       │ │
│  │ Language     │  │  • Hazard zones (red)                      │ │
│  │ Agent Trace  │  │  • Safe routes (blue)                      │ │
│  │             │  │  • SST heatmap (orange)                     │ │
│  └──────┬──────┘  │  • IMBL boundary (purple)                   │ │
│         │         └─────────────────────────────────────────────┘ │
└─────────┼────────────────────────────────────────────────────────┘
          │ POST /api/chat
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                                │
│  ┌──────────────┐  ┌──────────────────────────────────┐          │
│  │ Translation   │  │ LangGraph Orchestrator            │         │
│  │ Middleware     │→ │  ┌─────────┐ ┌─────────────────┐ │         │
│  │ (IndicTrans2)  │  │  │ Router  │→│ Tool Dispatcher  │ │         │
│  └──────────────┘  │  └─────────┘ └────────┬────────┘ │         │
│                    │               ┌───────┴────────┐  │         │
│                    │    ┌──────────┤  Tool Nodes     │  │         │
│                    │    ▼          ▼         ▼       ▼  │         │
│                    │  Data     Safety     PFZ     Route │         │
│                    │  Agent    Agent     Agent    Agent  │         │
│                    └────────────────────────────────────┘         │
│                    ┌──────────────────────────────────┐          │
│                    │     Mock GeoJSON Data Layer       │          │
│                    │  SST · Chlorophyll · Weather ·    │          │
│                    │  IMBL · PFZ Zones                 │          │
│                    └──────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
# The default .env has MOCK_MODE=true — no API key needed
python -m uvicorn app:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the map will center on the Tamil Nadu coast.

### Try These Queries

| Query | What Happens |
|-------|-------------|
| "Show me weather near Chennai" | SST heatmap + weather zones + safety assessment |
| "Is it safe to fish near Rameswaram?" | IMBL boundary + hazard zones + risk score |
| "Fishing zones near Kanyakumari" | PFZ polygons with confidence scores |
| "Route from Chennai to Kanyakumari" | Safe route polyline avoiding hazards |

### Enabling LLM Mode

To use the real LangGraph agent with Gemini:

```bash
# In backend/.env
MOCK_MODE=false
GOOGLE_API_KEY=your-gemini-api-key
```

## Project Structure

```
orca-marine/
├── backend/
│   ├── app.py                    # FastAPI entry + routes
│   ├── models.py                 # Pydantic schemas
│   ├── agents/
│   │   ├── graph.py              # LangGraph StateGraph
│   │   ├── tools.py              # 4 tool definitions
│   │   ├── mock_orchestrator.py  # Rule-based fallback
│   │   └── prompts.py            # System prompts
│   ├── middleware/
│   │   └── translation.py        # IndicTrans2 wrapper
│   └── data/
│       ├── mock_sst.py           # Sea Surface Temperature
│       ├── mock_chlorophyll.py   # Chlorophyll-a
│       ├── mock_weather.py       # Wind, waves, alerts
│       ├── mock_imbl.py          # Maritime boundary
│       └── mock_pfz.py           # Fishing zones
└── frontend/
    ├── src/
    │   ├── App.jsx               # Root layout
    │   ├── components/
    │   │   ├── MapView.jsx       # MapLibre GL map
    │   │   ├── ChatSidebar.jsx   # Chat interface
    │   │   ├── AgentReasoning.jsx # Execution trace
    │   │   ├── VoiceButton.jsx   # Voice input
    │   │   └── LayerPanel.jsx    # Layer toggles
    │   └── hooks/
    │       └── useSpeech.js      # Web Speech API
    └── package.json
```

## API Contract

```
POST /api/chat
Content-Type: application/json

Request:
{
  "message": "string",
  "location": "string",
  "language": "en" | "hi" | "ta"
}

Response:
{
  "text_response": "string",
  "agent_reasoning": [
    { "agent_name": "string", "action": "string", "result_summary": "string" }
  ],
  "geojson_layers": [
    {
      "id": "string",
      "type": "fill" | "line" | "circle" | "heatmap",
      "label": "string",
      "data": { GeoJSON FeatureCollection },
      "style": { "color": "#hex", "opacity": 0.6, "width": 2 }
    }
  ]
}
```

## Voice & Language Support

- **English** (en-IN)
- **Hindi** (hi-IN) — हिन्दी
- **Tamil** (ta-IN) — தமிழ்

Voice input uses the Web Speech API (Chrome/Edge recommended). The IndicTrans2 middleware handles automatic language detection via Unicode character ranges.

## License

Built for ISRO Marine Intelligence Platform.
