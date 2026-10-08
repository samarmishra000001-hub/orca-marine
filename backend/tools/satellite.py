import httpx
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Cache dictionary to store satellite data for 30 minutes
# Format: {(lat, lon, radius_km, 'sst'): {'data': dict, 'timestamp': datetime}}
_cache: Dict[tuple, Dict[str, Any]] = {}

def _check_cache(key: tuple) -> Optional[Dict[str, Any]]:
    if key in _cache:
        cached = _cache[key]
        if datetime.now() - cached['timestamp'] < timedelta(minutes=30):
            return cached['data']
    return None

def _set_cache(key: tuple, data: Dict[str, Any]) -> None:
    _cache[key] = {
        'data': data,
        'timestamp': datetime.now()
    }

async def get_sea_surface_temperature(lat: float, lon: float, radius_km: float = 50) -> dict:
    """Get SST data from NOAA ERDDAP.
    Uses the jplMURSST41 dataset (Multi-scale Ultra-high Resolution SST).
    ERDDAP URL: https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json
    Query: ?analysed_sst[(last)][(lat-delta):(lat+delta)][(lon-delta):(lon+delta)]
    where delta = radius_km / 111.0 (approximate degrees)
    
    Returns: average SST, min, max, grid points, timestamp, source.
    If ERDDAP fails, fall back to backend/data/mock_sst.py"""
    
    key = (lat, lon, radius_km, 'sst')
    cached_data = _check_cache(key)
    if cached_data:
        return cached_data

    delta = radius_km / 111.0
    url = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json"
    query = f"?analysed_sst[(last)][({lat-delta}):({lat+delta})][({lon-delta}):({lon+delta})]"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{url}{query}")
            response.raise_for_status()
            data = response.json()
            
            rows = data.get('table', {}).get('rows', [])
            if not rows:
                raise ValueError("No data found in ERDDAP response")
                
            sst_values = [row[3] for row in rows if row[3] is not None]
            
            if not sst_values:
                raise ValueError("No valid SST values found")
                
            result = {
                'average': sum(sst_values) / len(sst_values),
                'min': min(sst_values),
                'max': max(sst_values),
                'grid_points': len(sst_values),
                'timestamp': rows[0][0],
                'source': 'NOAA ERDDAP jplMURSST41'
            }
            _set_cache(key, result)
            return result
            
    except Exception as e:
        logger.warning(f"Failed to fetch SST from ERDDAP: {e}")
        return {
            'average': 'Unavailable',
            'min': 'Unavailable',
            'max': 'Unavailable',
            'grid_points': 0,
            'timestamp': datetime.now().isoformat(),
            'source': 'NOAA ERDDAP (Data Temporarily Unavailable)',
            'available': False
        }

async def get_chlorophyll(lat: float, lon: float, radius_km: float = 50) -> dict:
    """Get chlorophyll-a concentration from ERDDAP.
    Uses erdMH1chla8day dataset (MODIS Aqua Chlorophyll).
    URL: https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdMH1chla8day.json
    Query: ?chlorophyll[(last)][(lat-delta):(lat+delta)][(lon-delta):(lon+delta)]
    
    Returns: average chlorophyll, min, max, concentration_level (low/medium/high), source.
    If ERDDAP fails, fall back to backend/data/mock_chlorophyll.py"""
    
    key = (lat, lon, radius_km, 'chlorophyll')
    cached_data = _check_cache(key)
    if cached_data:
        return cached_data

    delta = radius_km / 111.0
    url = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdMH1chla8day.json"
    query = f"?chlorophyll[(last)][({lat-delta}):({lat+delta})][({lon-delta}):({lon+delta})]"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{url}{query}")
            response.raise_for_status()
            data = response.json()
            
            rows = data.get('table', {}).get('rows', [])
            if not rows:
                raise ValueError("No data found in ERDDAP response")
                
            chl_values = [row[3] for row in rows if row[3] is not None]
            
            if not chl_values:
                raise ValueError("No valid chlorophyll values found")
                
            avg_chl = sum(chl_values) / len(chl_values)
            level = 'low'
            if avg_chl > 1.0:
                level = 'medium'
            if avg_chl > 5.0:
                level = 'high'
                
            result = {
                'average': avg_chl,
                'min': min(chl_values),
                'max': max(chl_values),
                'concentration_level': level,
                'source': 'NOAA ERDDAP erdMH1chla8day'
            }
            _set_cache(key, result)
            return result
            
    except Exception as e:
        logger.warning(f"Failed to fetch chlorophyll from ERDDAP: {e}")
        return {
            'average': 'Unavailable',
            'min': 'Unavailable',
            'max': 'Unavailable',
            'concentration_level': 'Unavailable',
            'source': 'NOAA ERDDAP (Data Temporarily Unavailable)',
            'available': False
        }

async def get_ocean_currents(lat: float, lon: float) -> dict:
    """Get ocean surface currents from ERDDAP OSCAR dataset.
    Uses dataset oscar_currents (or similar).
    URL: https://coastwatch.pfeg.noaa.gov/erddap/griddap/oscar_currents.json
    
    Returns: current_speed, current_direction, u_component, v_component.
    If ERDDAP fails, return estimated data based on known Indian Ocean circulation patterns."""
    
    key = (lat, lon, 0, 'currents')
    cached_data = _check_cache(key)
    if cached_data:
        return cached_data

    url = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/oscar_currents.json"
    query = f"?u[(last)][(10.0)][({lat})][({lon})],v[(last)][(10.0)][({lat})][({lon})]"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{url}{query}")
            response.raise_for_status()
            data = response.json()
            
            rows = data.get('table', {}).get('rows', [])
            if not rows or not rows[0]:
                raise ValueError("No data found in ERDDAP response")
                
            u = rows[0][4]
            v = rows[0][5]
            
            if u is None or v is None:
                raise ValueError("No valid u or v component found")
                
            import math
            speed = math.sqrt(u**2 + v**2)
            direction = (math.degrees(math.atan2(v, u)) + 360) % 360
            
            result = {
                'current_speed': speed,
                'current_direction': direction,
                'u_component': u,
                'v_component': v,
                'source': 'NOAA ERDDAP oscar_currents'
            }
            _set_cache(key, result)
            return result
            
    except Exception as e:
        logger.warning(f"Failed to fetch currents from ERDDAP: {e}")
        return {
            'current_speed': 'Unavailable',
            'current_direction': 'Unavailable',
            'u_component': 'Unavailable',
            'v_component': 'Unavailable',
            'source': 'NOAA ERDDAP (Data Temporarily Unavailable)',
            'available': False
        }
