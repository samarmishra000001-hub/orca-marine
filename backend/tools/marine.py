import logging
from datetime import datetime, timezone, timedelta
import httpx
from typing import Dict, Any
from .weather import get_weather

logger = logging.getLogger(__name__)

CACHE_DURATION = timedelta(minutes=10)
_cache = {}

def _get_cache(key: str) -> Any:
    if key in _cache:
        data, timestamp = _cache[key]
        if datetime.now(timezone.utc) - timestamp < CACHE_DURATION:
            return data
    return None

def _set_cache(key: str, data: Any):
    _cache[key] = (data, datetime.now(timezone.utc))

BASE_URL = "https://marine-api.open-meteo.com/v1/marine"

async def get_wave_conditions(lat: float, lon: float) -> dict:
    """Get current wave conditions.
    Returns: wave_height, wave_direction, wave_period,
    wind_wave_height, wind_wave_direction, wind_wave_period,
    swell_wave_height, swell_wave_direction, swell_wave_period"""
    
    key = f"marine_current_{lat}_{lon}"
    cached = _get_cache(key)
    if cached:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period",
        "timezone": "auto"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            result = {
                "source": "Open-Meteo Marine API",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "available": True,
                "current": data.get("current", {}),
                "units": data.get("current_units", {})
            }
            _set_cache(key, result)
            return result
    except Exception as e:
        logger.error(f"Error fetching marine conditions: {e}")
        return {"error": str(e), "available": False}

async def get_wind_conditions(lat: float, lon: float) -> dict:
    """Get current wind over ocean.
    Combines weather wind data with wave-wind correlation."""
    
    weather_data = await get_weather(lat, lon)
    wave_data = await get_wave_conditions(lat, lon)
    
    if not weather_data.get("available") or not wave_data.get("available"):
        return {"error": "Could not fetch combined wind/wave data", "available": False}
        
    return {
        "source": "Open-Meteo API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "available": True,
        "weather_wind": {
            "speed": weather_data["current"].get("wind_speed_10m"),
            "direction": weather_data["current"].get("wind_direction_10m"),
            "gusts": weather_data["current"].get("wind_gusts_10m"),
            "speed_unit": weather_data["units"].get("wind_speed_10m"),
            "direction_unit": weather_data["units"].get("wind_direction_10m"),
        },
        "marine_wind_waves": {
            "height": wave_data["current"].get("wind_wave_height"),
            "direction": wave_data["current"].get("wind_wave_direction"),
            "period": wave_data["current"].get("wind_wave_period"),
            "height_unit": wave_data["units"].get("wind_wave_height"),
            "direction_unit": wave_data["units"].get("wind_wave_direction"),
        }
    }

async def get_marine_forecast(lat: float, lon: float, hours: int = 48) -> dict:
    """Get hourly marine forecast including waves, swell, wind waves."""
    key = f"marine_forecast_{lat}_{lon}_{hours}"
    cached = _get_cache(key)
    if cached:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,swell_wave_height,swell_wave_direction,swell_wave_period",
        "timezone": "auto",
        "forecast_hours": hours
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            result = {
                "source": "Open-Meteo Marine API",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "available": True,
                "hourly": data.get("hourly", {}),
                "units": data.get("hourly_units", {})
            }
            _set_cache(key, result)
            return result
    except Exception as e:
        logger.error(f"Error fetching marine forecast: {e}")
        return {"error": str(e), "available": False}
