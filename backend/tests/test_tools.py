import pytest
import asyncio
from agents.tools import discover_ocean_data, compute_safe_route

def test_discover_ocean_data():
    res = discover_ocean_data.invoke({"lat": 18.92, "lon": 72.82})
    assert "source" in res
    assert "timestamp" in res
    assert "status" in res
    assert res["status"] in ["LIVE", "FORECAST", "UNAVAILABLE"]

def test_compute_safe_route():
    res = compute_safe_route.invoke({
        "start_lat": 18.5, "start_lon": 71.5,
        "end_lat": 19.5, "end_lon": 73.5
    })
    assert "intersects_hazard" in res["data"]
    assert "distance_nm" in res["data"]
