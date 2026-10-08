from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

# === Existing (keep) ===
class ChatRequest(BaseModel):
    message: str
    location: str = 'auto'
    language: str = 'en'
    latitude: Optional[float] = None
    longitude: Optional[float] = None  
    session_id: Optional[str] = None
    user_role: str = 'general'
    selected_layers: Optional[List[str]] = None

class AgentStep(BaseModel):
    agent_name: str
    action: str
    result_summary: str

class LayerStyle(BaseModel):
    color: str
    opacity: float = 0.6
    width: float = 2.0

class GeoJSONLayer(BaseModel):
    id: str
    type: Literal['fill', 'line', 'circle', 'heatmap']
    label: str
    data: Dict[str, Any]
    style: LayerStyle

# === New models ===
class Citation(BaseModel):
    source: str
    timestamp: Optional[str] = None
    freshness: Optional[str] = None  # 'live', 'recent', 'cached', 'historical'
    url: Optional[str] = None

class ChartData(BaseModel):
    chart_type: Literal['line', 'bar', 'area', 'gauge', 'radar', 'comparison']
    title: str
    x_axis: Optional[Dict[str, Any]] = None
    y_axis: Optional[Dict[str, Any]] = None
    series: List[Dict[str, Any]] = []
    source: Optional[str] = None
    timestamp: Optional[str] = None

class RiskLevel(str, Enum):
    LOW = 'LOW'
    MODERATE = 'MODERATE'
    HIGH = 'HIGH'
    SEVERE = 'SEVERE'

class RiskAssessmentResponse(BaseModel):
    risk_level: str
    score: float = 0
    factors: List[Dict[str, Any]] = []
    confidence: float = 0
    explanation: str = ''
    recommendations: List[str] = []
    disclaimer: str = 'This is informational only. Follow official marine safety guidance.'

class ChatResponse(BaseModel):
    text_response: str
    agent_reasoning: List[AgentStep] = []
    geojson_layers: List[GeoJSONLayer] = []
    charts: List[ChartData] = []
    risk_assessment: Optional[RiskAssessmentResponse] = None
    citations: List[Citation] = []
    session_id: Optional[str] = None

class UserPreference(BaseModel):
    session_id: str
    role: str
    language: str
    unit_system: str
