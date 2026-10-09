from models import ChatRequest, ChatResponse, AgentStep, GeoJSONLayer, LayerStyle, CoastalTelemetry
from agents.tools import (
    discover_ocean_data,
    assess_safety_risk,
    find_potential_fishing_zones,
    compute_safe_route,
    get_tide_and_weather_forecast,
    get_severe_weather_alerts,
    analyze_fishery_decline,
    audit_restricted_zones
)

async def mock_orchestrate(request: ChatRequest) -> ChatResponse:
    # Use real tools from tools.py
    lat = 18.92 # Default to Mumbai if no location
    lon = 72.82
    
    steps = []
    
    res = discover_ocean_data.invoke({"lat": lat, "lon": lon})
    steps.append(AgentStep(
        agent_name="Real Data Agent",
        action="fetch_open_meteo",
        result_summary=f"Fetched LIVE data from {res.get('source')}"
    ))

    text_response = f"LIVE DATA PORTAL ({res.get('source', 'Unknown')})\n"
    if res.get("status") == "UNAVAILABLE":
        text_response += "API UNAVAILABLE. Cannot fetch ocean data."
    else:
        data = res.get("data", {})
        text_response += f"• SST: {data.get('sst_celsius')} {data.get('units', {}).get('sst')}\n"
        text_response += f"• Wind Speed: {data.get('wind_speed_kmh')} {data.get('units', {}).get('wind_speed')}\n"
        text_response += f"• Wave Height: {data.get('wave_height_m')} {data.get('units', {}).get('wave_height')}\n"

    telemetry = CoastalTelemetry(
        location="Mumbai",
        sea_state="Real Data",
        wave_height_m=res.get("data", {}).get("wave_height_m", 0) if res.get("status") != "UNAVAILABLE" else 0,
        wind_speed_kmh=res.get("data", {}).get("wind_speed_kmh", 0) if res.get("status") != "UNAVAILABLE" else 0,
        tide_summary="LIVE",
        alert_level="NORMAL"
    )

    return ChatResponse(
        text_response=text_response,
        agent_reasoning=steps,
        geojson_layers=[],
        telemetry=telemetry
    )
