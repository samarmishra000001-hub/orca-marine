import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from .weather import get_weather, get_weather_forecast
from .marine import get_wave_conditions

logger = logging.getLogger(__name__)

async def get_alerts(lat: float, lon: float) -> dict:
    """Get active weather alerts/warnings for a location.
    Uses Open-Meteo current weather to derive alert conditions:
    - Wind speed > 50 km/h -> Wind Warning
    - Precipitation > 10 mm -> Heavy Rain Alert
    - Visibility < 2 km -> Low Visibility Warning
    Returns list of alert objects with severity, type, description, valid_time."""
    
    alerts = []
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Get weather and marine data
    weather_data = await get_weather(lat, lon)
    weather_forecast_data = await get_weather_forecast(lat, lon, hours=1) # Get visibility from hourly
    marine_data = await get_wave_conditions(lat, lon)
    
    if weather_data.get("available"):
        current = weather_data["current"]
        
        wind_speed = current.get("wind_speed_10m")
        if wind_speed is not None and wind_speed > 50:
            alerts.append({
                "severity": "Warning",
                "type": "Wind Warning",
                "description": f"High winds detected: {wind_speed} km/h",
                "valid_time": timestamp
            })
            
        precipitation = current.get("precipitation")
        if precipitation is not None and precipitation > 10:
            alerts.append({
                "severity": "Alert",
                "type": "Heavy Rain Alert",
                "description": f"Heavy precipitation detected: {precipitation} mm",
                "valid_time": timestamp
            })

    if weather_forecast_data.get("available"):
        hourly = weather_forecast_data["hourly"]
        visibility_list = hourly.get("visibility", [])
        if visibility_list and len(visibility_list) > 0:
            visibility = visibility_list[0]
            if visibility is not None and visibility < 2000:
                alerts.append({
                    "severity": "Warning",
                    "type": "Low Visibility Warning",
                    "description": f"Low visibility detected: {visibility/1000} km",
                    "valid_time": timestamp
                })
    
    if marine_data.get("available"):
        current_marine = marine_data["current"]
        wave_height = current_marine.get("wave_height")
        
        if wave_height is not None and wave_height > 2.5:
            alerts.append({
                "severity": "Warning",
                "type": "High Wave Alert",
                "description": f"High waves detected: {wave_height} m",
                "valid_time": timestamp
            })
            
    return {
        "timestamp": timestamp,
        "available": True,
        "alerts": alerts
    }
