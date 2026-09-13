import os
import sys
import importlib.util

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/ocean", tags=["Ocean ISRO Data"])

def _get_mock_seed():
    """Dynamically import mock_isro_seed without relative imports."""
    import importlib
    try:
        from data import mock_isro_seed
        return mock_isro_seed
    except ImportError:
        # Fallback: direct path import
        spec = importlib.util.spec_from_file_location(
            "mock_isro_seed",
            os.path.join(os.path.dirname(__file__), "..", "data", "mock_isro_seed.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

@router.get("/sst")
def get_sst(
    bbox: str = Query(None, description="Bounding box in format min_lon,min_lat,max_lon,max_lat")
):
    """
    Returns Sea Surface Temperature points within a bounding box.
    Always served from mock seed unless a live PostGIS DB is configured.
    """
    seed = _get_mock_seed()
    return seed.get_mock_sst(bbox=bbox)

@router.get("/pfz")
def get_pfz(
    bbox: str = Query(None, description="Bounding box in format min_lon,min_lat,max_lon,max_lat")
):
    """
    Returns Potential Fishing Zones (Polygons) within a bounding box.
    Always served from mock seed unless a live PostGIS DB is configured.
    """
    seed = _get_mock_seed()
    return seed.get_mock_pfz(bbox=bbox)

@router.get("/chlorophyll")
def get_chlorophyll(
    bbox: str = Query(None, description="Bounding box in format min_lon,min_lat,max_lon,max_lat")
):
    """Returns chlorophyll mock data."""
    import random
    from datetime import datetime
    features = []
    for _ in range(40):
        lon = random.uniform(70.0, 90.0)
        lat = random.uniform(8.0, 20.0)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "source": "bhuvan_ocm3_mock",
                "concentration_mg_m3": round(random.uniform(0.1, 3.5), 3),
                "timestamp": datetime.utcnow().isoformat()
            }
        })
    return {"type": "FeatureCollection", "features": features}

@router.get("/stations")
def get_stations():
    """Returns AWS weather station mock data."""
    import random
    from datetime import datetime
    stations = [
        ("AWS-TN-01", 80.27, 13.08), ("AWS-KL-02", 76.95, 10.53),
        ("AWS-GJ-03", 70.21, 23.00), ("AWS-AP-04", 80.43, 14.18),
        ("AWS-MH-05", 72.82, 18.92), ("AWS-OR-06", 85.82, 20.46)
    ]
    features = []
    for sid, lon, lat in stations:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "station_id": sid,
                "source": "mosdac_aws_mock",
                "wind_speed_kmh": round(random.uniform(10, 55), 1),
                "wave_height_m": round(random.uniform(0.5, 4.5), 2),
                "timestamp": datetime.utcnow().isoformat()
            }
        })
    return {"type": "FeatureCollection", "features": features}

