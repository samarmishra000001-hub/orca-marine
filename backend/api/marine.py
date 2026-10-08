from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from tools.weather import get_weather, get_weather_forecast
from tools.marine import get_wave_conditions, get_marine_forecast
from tools.satellite import get_sea_surface_temperature, get_chlorophyll, get_ocean_currents
from tools.alerts import get_alerts
from tools.location import resolve_location, get_location_context
from services.risk_engine import calculate_marine_risk

router = APIRouter(prefix="/api/marine", tags=["marine-data"])

@router.get("/weather")
async def fetch_weather(lat: float = Query(...), lon: float = Query(...)):
    """Direct live weather endpoint."""
    return await get_weather(lat, lon)

@router.get("/forecast")
async def fetch_forecast(lat: float = Query(...), lon: float = Query(...), hours: int = Query(48)):
    """Hourly atmospheric & marine forecast."""
    weather_fc = await get_weather_forecast(lat, lon, hours)
    marine_fc = await get_marine_forecast(lat, lon, hours)
    return {
        "weather_forecast": weather_fc,
        "marine_forecast": marine_fc
    }

@router.get("/waves")
async def fetch_waves(lat: float = Query(...), lon: float = Query(...)):
    """Live wave, swell, and sea state conditions."""
    return await get_wave_conditions(lat, lon)

@router.get("/sst")
async def fetch_sst(lat: float = Query(...), lon: float = Query(...), radius_km: float = Query(50.0)):
    """Sea Surface Temperature observation."""
    return await get_sea_surface_temperature(lat, lon, radius_km)

@router.get("/chlorophyll")
async def fetch_chlorophyll(lat: float = Query(...), lon: float = Query(...), radius_km: float = Query(50.0)):
    """Chlorophyll-a concentration."""
    return await get_chlorophyll(lat, lon, radius_km)

@router.get("/currents")
async def fetch_currents(lat: float = Query(...), lon: float = Query(...)):
    """Surface ocean currents speed and direction."""
    return await get_ocean_currents(lat, lon)

@router.get("/alerts")
async def fetch_alerts(lat: float = Query(...), lon: float = Query(...)):
    """Active marine warnings and hazard thresholds."""
    return await get_alerts(lat, lon)

@router.get("/risk")
async def evaluate_risk(
    lat: float = Query(...),
    lon: float = Query(...),
    vessel_type: str = Query("fishing")
):
    """Deterministic marine risk assessment."""
    marine_data = await get_wave_conditions(lat, lon)
    weather_data = await get_weather(lat, lon)
    alerts_data = await get_alerts(lat, lon)

    wave_ht = marine_data.get("wave_height", 1.2) or 1.2
    wind_spd = weather_data.get("wind_speed_10m", 15.0) or 15.0
    wind_gusts = weather_data.get("wind_gusts_10m", 20.0) or 20.0
    vis_m = weather_data.get("visibility", 10000.0) or 10000.0
    has_warn = bool(alerts_data.get("alerts"))

    assessment = calculate_marine_risk(
        wave_height=wave_ht,
        wind_speed=wind_spd,
        wind_gusts=wind_gusts,
        visibility=vis_m / 1000.0,
        has_active_warnings=has_warn,
        vessel_type=vessel_type
    )

    return assessment.model_dump()

@router.get("/location")
async def location_intel(query: Optional[str] = Query(None), lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Resolve location by name or coordinates."""
    if query:
        res = resolve_location(query)
        if res:
            return res
        raise HTTPException(status_code=404, detail=f"Location '{query}' not found in coastal gazetteer")
    elif lat is not None and lon is not None:
        return get_location_context(lat, lon)
    raise HTTPException(status_code=400, detail="Provide either 'query' or ('lat' and 'lon')")
