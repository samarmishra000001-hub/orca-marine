import logging
from datetime import datetime, timezone, timedelta
import httpx
from typing import Dict, Any

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

BASE_URL = "https://api.open-meteo.com/v1/forecast"

async def get_weather(lat: float, lon: float) -> dict:
    """Get current weather conditions.
    Returns: temperature_2m, relative_humidity_2m, apparent_temperature,
    precipitation, cloud_cover, pressure_msl, surface_pressure,
    wind_speed_10m, wind_direction_10m, wind_gusts_10m, visibility"""
    
    key = f"weather_current_{lat}_{lon}"
    cached = _get_cache(key)
    if cached:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "timezone": "auto"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            result = {
                "source": "Open-Meteo Weather API",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "available": True,
                "current": data.get("current", {}),
                "units": data.get("current_units", {})
            }
            _set_cache(key, result)
            return result
    except Exception as e:
        logger.error(f"Error fetching weather: {e}")
        return {"error": str(e), "available": False}

async def get_weather_forecast(lat: float, lon: float, hours: int = 48) -> dict:
    """Get hourly weather forecast.
    Returns same parameters as get_weather but for future hours.
    Include timestamps for each hour."""
    key = f"weather_forecast_{lat}_{lon}_{hours}"
    cached = _get_cache(key)
    if cached:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility",
        "timezone": "auto",
        "forecast_hours": hours
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            result = {
                "source": "Open-Meteo Weather API",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "available": True,
                "hourly": data.get("hourly", {}),
                "units": data.get("hourly_units", {})
            }
            _set_cache(key, result)
            return result
    except Exception as e:
        logger.error(f"Error fetching weather forecast: {e}")
        return {"error": str(e), "available": False}
