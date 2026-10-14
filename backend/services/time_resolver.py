"""
ORCA 4D Time Resolver Service.
Translates timeline offsets (-48h to +72h) into ISO timestamps, temporal windows, and forecast modifiers.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

TIMELINE_STEPS = [
    {"offset": -48, "label": "-48h Past", "category": "HISTORICAL"},
    {"offset": -24, "label": "-24h Past", "category": "HISTORICAL"},
    {"offset": -12, "label": "-12h Past", "category": "HISTORICAL"},
    {"offset": -6, "label": "-6h Past", "category": "RECENT"},
    {"offset": 0, "label": "Live Now", "category": "LIVE"},
    {"offset": 6, "label": "+6h Forecast", "category": "FORECAST"},
    {"offset": 12, "label": "+12h Forecast", "category": "FORECAST"},
    {"offset": 24, "label": "+24h Forecast", "category": "FORECAST"},
    {"offset": 48, "label": "+48h Outlook", "category": "OUTLOOK"},
    {"offset": 72, "label": "+72h Outlook", "category": "OUTLOOK"},
]

def resolve_time_window(offset_hours: int = 0) -> Dict[str, Any]:
    """
    Given an offset in hours relative to current UTC,
    return resolved timestamps, timeline label, category, and data modifier hints.
    """
    now = datetime.now(timezone.utc)
    target_dt = now + timedelta(hours=offset_hours)
    
    if offset_hours == 0:
        category = "LIVE"
        label = "Live Now"
    elif offset_hours < 0:
        category = "HISTORICAL" if offset_hours <= -12 else "RECENT"
        label = f"{offset_hours}h Past"
    else:
        category = "FORECAST" if offset_hours <= 24 else "OUTLOOK"
        label = f"+{offset_hours}h Forecast"
        
    return {
        "offset_hours": offset_hours,
        "label": label,
        "category": category,
        "target_iso": target_dt.isoformat(),
        "target_display": target_dt.strftime("%d %b %Y, %H:%M UTC"),
        "is_forecast": offset_hours > 0,
        "is_historical": offset_hours < 0,
        "is_live": offset_hours == 0
    }

def apply_temporal_variation(base_wave: float, base_wind: float, offset_hours: int) -> Dict[str, float]:
    """
    Applies realistic cyclical variation for past/future projections based on diurnal tide and wind cycles.
    """
    import math
    if offset_hours == 0:
        return {"wave_height_m": round(base_wave, 2), "wind_speed_kmh": round(base_wind, 1)}
    
    # 12.42-hour tidal cycle modulation
    tide_phase = (offset_hours % 12.42) / 12.42 * 2 * math.pi
    wave_mod = base_wave + 0.35 * math.sin(tide_phase)
    wave_mod = max(0.4, round(wave_mod, 2))
    
    # Diurnal wind cycle modulation
    wind_phase = (offset_hours % 24.0) / 24.0 * 2 * math.pi
    wind_mod = base_wind + 5.0 * math.sin(wind_phase)
    wind_mod = max(4.0, round(wind_mod, 1))
    
    return {
        "wave_height_m": wave_mod,
        "wind_speed_kmh": wind_mod
    }
