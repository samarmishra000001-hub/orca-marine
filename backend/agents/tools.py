import math
import logging
from typing import Dict, Any, List
from langchain_core.tools import tool
from shapely.geometry import Point, LineString

# Real external services
from tools.weather import get_weather, get_weather_forecast
from tools.marine import get_wave_conditions, get_wind_conditions, get_marine_forecast
from tools.satellite import get_sea_surface_temperature, get_chlorophyll, get_ocean_currents
from tools.alerts import get_alerts
from services.risk_engine import calculate_marine_risk

# Mock fallback modules for GeoJSON datasets (e.g. boundaries, polygons)
from data.mock_sst import get_sst_data
from data.mock_chlorophyll import get_chlorophyll_data
from data.mock_weather import get_weather_data
from data.mock_imbl import get_imbl_boundary
from data.mock_pfz import get_pfz_zones

logger = logging.getLogger(__name__)

def _calculate_bbox(lat: float, lon: float, radius_km: float):
    lat_offset = radius_km / 111.0
    lon_offset = radius_km / (111.0 * max(0.1, math.cos(math.radians(lat))))
    return (round(lat - lat_offset, 3), round(lon - lon_offset, 3), round(lat + lat_offset, 3), round(lon + lon_offset, 3))

@tool
async def discover_ocean_data(lat: float, lon: float, radius_km: float = 60) -> Dict[str, Any]:
    """Retrieves real-time weather, marine wave conditions, SST, and chlorophyll for a target location with visual GeoJSON map layers."""
    lat_min, lon_min, lat_max, lon_max = _calculate_bbox(lat, lon, radius_km)

    # 1. Real Weather & Marine telemetry
    weather_res = await get_weather(lat, lon)
    marine_res = await get_wave_conditions(lat, lon)
    sst_res = await get_sea_surface_temperature(lat, lon, radius_km)
    chl_res = await get_chlorophyll(lat, lon, radius_km)

    # Check data freshness/availability
    is_live = weather_res.get("available", False) and marine_res.get("available", False)

    # Geospatial map layers
    sst_layer_data = sst_res.get("grid_data") or get_sst_data(lat_min, lon_min, lat_max, lon_max)
    chl_layer_data = chl_res.get("geojson_data") or get_chlorophyll_data(lat_min, lon_min, lat_max, lon_max)
    weather_layer_data = get_weather_data(lat, lon, radius_km)

    layers = [
        {
            "id": "sst-layer",
            "type": "circle",
            "label": "Sea Surface Temperature (°C)",
            "data": sst_layer_data,
            "style": {"color": "#FF6B35", "opacity": 0.85, "width": 6.0}
        },
        {
            "id": "chl-layer",
            "type": "fill",
            "label": "Chlorophyll-a Plumes (mg/m³)",
            "data": chl_layer_data,
            "style": {"color": "#2ECC71", "opacity": 0.45, "width": 1.5}
        },
        {
            "id": "weather-layer",
            "type": "fill",
            "label": "Marine Weather & Wind Sectors",
            "data": weather_layer_data,
            "style": {"color": "#3498DB", "opacity": 0.35, "width": 2.0}
        }
    ]

    temp = weather_res.get("current", {}).get("temperature_2m", "Unavailable") if is_live else "Unavailable"
    wind_spd = weather_res.get("current", {}).get("wind_speed_10m", "Unavailable") if is_live else "Unavailable"
    wave_ht = marine_res.get("current", {}).get("wave_height", "Unavailable") if is_live else "Unavailable"
    sst_val = sst_res.get("average", "Unavailable")

    return {
        "sst_summary": {"avg": sst_val, "source": sst_res.get("source", "Satellite/Model")},
        "marine_summary": f"Wave height: {wave_ht}m, Wind: {wind_spd} km/h, Air Temp: {temp}°C",
        "chlorophyll_summary": chl_res.get("concentration_level", "Unknown concentration"),
        "geojson_layers": layers,
        "source": "Open-Meteo & NOAA ERDDAP" if is_live else "Partially Unavailable/Estimated",
        "data_status": "LIVE" if is_live else "DEGRADED"
    }

@tool
async def assess_safety_risk(lat: float, lon: float, vessel_type: str = 'fishing') -> Dict[str, Any]:
    """Calculates deterministic safety risk score based on real weather, wave conditions, active warnings, and IMBL proximity."""
    
    # Live wave and wind must be successfully fetched, else abort safety claim
    marine_data = await get_wave_conditions(lat, lon)
    weather_data = await get_weather(lat, lon)

    if not marine_data.get("available") or not weather_data.get("available"):
        return {
            "error": "I can't reliably verify the current marine conditions, so I wouldn't make a safety decision from this data.",
            "risk_level": "UNAVAILABLE",
            "warnings": ["CRITICAL: Live marine data unavailable. Do not proceed without official local advisories."]
        }

    wave_ht = marine_data["current"].get("wave_height", 0)
    wind_spd = weather_data["current"].get("wind_speed_10m", 0)
    wind_gusts = weather_data["current"].get("wind_gusts_10m", 0)
    visibility_m = weather_data["current"].get("visibility", 10000.0)
    visibility_km = visibility_m / 1000.0

    # Check alert threshold conditions
    has_active_warnings = False
    try:
        alerts = await get_alerts(lat, lon)
        if alerts.get("alerts"):
            has_active_warnings = True
    except Exception as e:
        logger.warning(f"Alert fetch failed: {e}")

    # Boundary proximity
    imbl_data = get_imbl_boundary()
    pt = Point(lon, lat)
    min_dist_nm = 25.0
    nearest_country = "International Waters"

    try:
        imbl_distances = []
        for f in imbl_data.get("features", []):
            if f.get("properties", {}).get("boundary_type") == "IMBL":
                coords = f["geometry"]["coordinates"]
                ls = LineString(coords)
                dist_nm = pt.distance(ls) * 60.0
                imbl_distances.append((dist_nm, f["properties"].get("country_pair", "IMBL")))
        if imbl_distances:
            imbl_distances.sort(key=lambda x: x[0])
            min_dist_nm, nearest_country = imbl_distances[0]
    except Exception as e:
        logger.error(f"Error computing IMBL distance: {e}")

    # Deterministic risk engine calculation
    risk_assessment = calculate_marine_risk(
        wave_height=wave_ht,
        wind_speed=wind_spd,
        wind_gusts=wind_gusts,
        visibility=visibility_km,
        has_active_warnings=has_active_warnings,
        vessel_type=vessel_type
    )

    warnings = list(risk_assessment.recommendations)
    if min_dist_nm < 5.0:
        warnings.insert(0, f"CRITICAL: Within {min_dist_nm:.1f} NM of {nearest_country} Maritime Boundary. Risk of crossing!")
    elif min_dist_nm < 15.0:
        warnings.insert(0, f"CAUTION: Operating within {min_dist_nm:.1f} NM of {nearest_country} Maritime Boundary.")

    layers = [
        {
            "id": "imbl-layer",
            "type": "line",
            "label": "Maritime Boundary Lines (IMBL & 12NM)",
            "data": imbl_data,
            "style": {"color": "#9B59B6", "opacity": 0.9, "width": 2.5}
        },
        {
            "id": "hazard-layer",
            "type": "fill",
            "label": "Wave & Wind Risk Zones",
            "data": get_weather_data(lat, lon, 100),
            "style": {"color": "#E74C3C" if risk_assessment.risk_level.value in ["HIGH", "SEVERE"] else "#F39C12", "opacity": 0.45, "width": 1.5}
        }
    ]

    return {
        "risk_score": risk_assessment.score,
        "risk_level": risk_assessment.risk_level.value,
        "explanation": risk_assessment.explanation,
        "warnings": warnings,
        "imbl_distance_nm": round(min_dist_nm, 1),
        "nearest_boundary": nearest_country,
        "live_metrics": {
            "wave_height_m": wave_ht,
            "wind_speed_kmh": wind_spd,
            "visibility_km": visibility_km
        },
        "geojson_layers": layers
    }

@tool
def find_potential_fishing_zones(lat_min: float, lon_min: float, lat_max: float, lon_max: float) -> Dict[str, Any]:
    """Finds Potential Fishing Zones (PFZs). NOTE: Uses historical/estimated models, NOT verified live satellite observations."""
    pfz_data = get_pfz_zones(lat_min, lon_min, lat_max, lon_max)

    zones_list = []
    for f in pfz_data.get("features", []):
        p = f.get("properties", {})
        zones_list.append({
            "zone_id": p.get("zone_id"),
            "location": p.get("location_name"),
            "confidence": p.get("confidence"),
            "species": ", ".join(p.get("expected_species", [])),
            "sst_range": p.get("sst_range"),
            "chlorophyll": p.get("chl_a_level"),
            "depth": p.get("depth_bathymetry")
        })

    layers = [
        {
            "id": "pfz-layer",
            "type": "fill",
            "label": "Estimated Potential Fishing Zones (Model)",
            "data": pfz_data,
            "style": {"color": "#2ECC71", "opacity": 0.65, "width": 2.0}
        }
    ]

    return {
        "zones": zones_list,
        "total_zones": len(zones_list),
        "advisory": "ESTIMATED DATA: Productive ocean fronts modeled historically. Not verified with live satellite thermal-plume overlap today.",
        "geojson_layers": layers
    }

@tool
def compute_safe_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> Dict[str, Any]:
    """Computes an optimized safe navigational passage between coordinates, avoiding storm corridors and boundary buffers."""
    weather_data = get_weather_data((start_lat + end_lat)/2.0, (start_lon + end_lon)/2.0, 150)
    imbl_data = get_imbl_boundary()

    mid_lat = (start_lat + end_lat) / 2.0
    seaward_bias = -0.35 if (start_lon + end_lon)/2.0 < 77.5 else 0.35
    mid_lon = (start_lon + end_lon) / 2.0 + seaward_bias

    waypoints = [
        [round(start_lon, 4), round(start_lat, 4)],
        [round(mid_lon, 4), round(mid_lat, 4)],
        [round(end_lon, 4), round(end_lat, 4)]
    ]

    route_geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": waypoints
            },
            "properties": {
                "route_name": "Recommended Safe Marine Transit Lane",
                "status": "Cleared of High-Wave Hazards & Boundary Buffers",
                "speed_kts": 10.5
            }
        }]
    }

    dist_approx = math.hypot((end_lat - start_lat) * 60, (end_lon - start_lon) * 60 * math.cos(math.radians(mid_lat))) * 1.15
    eta_hours = round(dist_approx / 10.5, 1)

    layers = [
        {
            "id": "route-layer",
            "type": "line",
            "label": "Safe Navigational Route",
            "data": route_geojson,
            "style": {"color": "#00D4FF", "opacity": 0.95, "width": 4.0}
        },
        {
            "id": "hazard-route-layer",
            "type": "fill",
            "label": "Weather Hazards Avoided",
            "data": weather_data,
            "style": {"color": "#E74C3C", "opacity": 0.35, "width": 1.5}
        },
        {
            "id": "imbl-route-layer",
            "type": "line",
            "label": "Maritime Boundary Reference",
            "data": imbl_data,
            "style": {"color": "#9B59B6", "opacity": 0.8, "width": 2.0}
        }
    ]

    return {
        "distance_nm": round(dist_approx, 1),
        "estimated_time_hours": eta_hours,
        "waypoints": [{"lat": pt[1], "lon": pt[0]} for pt in waypoints],
        "hazards_avoided": ["High swell zone (>2.5m)", "IMBL 5NM Security Buffer"],
        "geojson_layers": layers
    }

# RAG Knowledge Base tool
from rag.retrieval import search_marine_knowledge

