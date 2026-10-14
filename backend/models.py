from typing import Literal, List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ChatMessageHistory(BaseModel):
    role: Literal['user', 'assistant', 'system']
    content: str

class ChatRequest(BaseModel):
    message: str
    location: str = "Chennai"
    language: str = "en"
    vessel_type: Optional[str] = "motorized_boat"  # country_craft, motorized_boat, mechanized_trawler
    time_horizon: Optional[str] = "current"        # current, tomorrow_morning, 24h
    persona: Optional[str] = "fisher"              # fisher, coast_guard, researcher/biologist
    user_role: Optional[str] = "fisher"            # fisher, coast_guard, biologist
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

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
    data: Dict[str, Any]  # GeoJSON FeatureCollection
    style: LayerStyle

class CoastalTelemetry(BaseModel):
    location: str
    sea_state: str
    wave_height_m: float
    wind_speed_kmh: float
    tide_summary: str
    alert_level: str  # NORMAL, CAUTION, WARNING, SEVERE

class MapAction(BaseModel):
    type: str = "flyTo"
    lat: float
    lon: float
    zoom: float = 7.5
    enable_layers: List[str] = Field(default_factory=list)
    label: Optional[str] = None

class ChatResponse(BaseModel):
    text_response: str
    agent_reasoning: List[AgentStep]
    geojson_layers: List[GeoJSONLayer]
    telemetry: Optional[CoastalTelemetry] = None
    map_action: Optional[MapAction] = None

# ==============================================================================
# SPATIAL TOOLS & PROBE MODELS
# ==============================================================================

class ProbeRequest(BaseModel):
    lat: float
    lon: float
    timestamp_offset_hours: int = 0
    persona: str = "fisher"  # fisher, coast_guard, researcher

class NearestDistance(BaseModel):
    name: str
    distance_nm: float
    distance_km: float
    description: Optional[str] = None
    warning: Optional[str] = None
    status: Optional[str] = None

class ProbeResponse(BaseModel):
    lat: float
    lon: float
    timestamp: str
    timestamp_offset_hours: int
    time_label: str
    sst_c: float
    chlorophyll_mg_m3: float
    wave_height_m: float
    wind_speed_kts: float
    wind_speed_kmh: float
    current_dir: str
    sea_state: str
    risk_score: float
    risk_level: str
    nearest_pfz: Optional[NearestDistance] = None
    nearest_mpa: Optional[NearestDistance] = None
    imbl_distance: Optional[NearestDistance] = None
    human_advisory: str
    persona: str
    sources: List[str] = Field(default_factory=list)

class LatLonPoint(BaseModel):
    lat: float
    lon: float

class RouteAnalyzeRequest(BaseModel):
    waypoints: List[LatLonPoint]
    vessel_speed_kts: float = 12.0
    fuel_burn_lph: float = 18.0
    vessel_type: str = "motorized_boat"

class RouteSegmentRisk(BaseModel):
    segment_index: int
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    distance_nm: float
    distance_km: float
    wave_height_m: float
    wind_speed_kmh: float
    risk_score: float
    risk_level: str

class RouteAnalyzeResponse(BaseModel):
    total_distance_nm: float
    total_distance_km: float
    eta_hours: float
    estimated_fuel_liters: float
    segment_risks: List[RouteSegmentRisk]
    crosses_mpa: bool
    mpa_warnings: List[str]
    imbl_warning: bool
    imbl_min_distance_nm: float
    overall_risk: str
    recommendation: str
    waypoints: List[Dict[str, float]]
