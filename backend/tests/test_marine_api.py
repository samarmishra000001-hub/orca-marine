import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_marine_probe_endpoint():
    payload = {
        "lat": 18.92,
        "lon": 72.82,
        "timestamp_offset_hours": 0,
        "persona": "fisher"
    }
    response = client.post("/api/marine/probe", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Raw scientific metrics
    assert "sst_c" in data
    assert "chlorophyll_mg_m3" in data
    assert "wave_height_m" in data
    assert "wind_speed_kts" in data
    assert "current_dir" in data
    assert "risk_score" in data
    assert "risk_level" in data
    
    # Distance checks in NM
    assert "nearest_pfz" in data
    assert data["nearest_pfz"]["distance_nm"] >= 0
    assert "nearest_mpa" in data
    assert data["nearest_mpa"]["distance_nm"] >= 0
    assert "imbl_distance" in data
    assert data["imbl_distance"]["distance_nm"] >= 0
    
    # Human advisory
    assert "human_advisory" in data
    assert len(data["human_advisory"]) > 20
    assert data["persona"] == "fisher"

def test_marine_probe_coastguard_persona():
    payload = {
        "lat": 9.28,
        "lon": 79.35, # Palk strait near IMBL
        "timestamp_offset_hours": 6,
        "persona": "coast_guard"
    }
    response = client.post("/api/marine/probe", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["persona"] == "coast_guard"
    assert data["timestamp_offset_hours"] == 6
    # Should detect close proximity to IMBL
    assert data["imbl_distance"]["distance_nm"] < 30.0

def test_marine_route_analyze_endpoint():
    payload = {
        "waypoints": [
            {"lat": 18.92, "lon": 72.82},
            {"lat": 18.50, "lon": 72.50},
            {"lat": 17.50, "lon": 72.00}
        ],
        "vessel_speed_kts": 12.0,
        "fuel_burn_lph": 18.0,
        "vessel_type": "motorized_boat"
    }
    response = client.post("/api/marine/route-analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_distance_nm"] > 0
    assert data["total_distance_km"] > data["total_distance_nm"]
    assert data["eta_hours"] > 0
    assert data["estimated_fuel_liters"] > 0
    assert len(data["segment_risks"]) == 2
    assert "crosses_mpa" in data
    assert "imbl_warning" in data
    assert "overall_risk" in data
    assert "recommendation" in data

def test_marine_layers_endpoints():
    res_pfz = client.get("/api/marine/layers/pfz")
    assert res_pfz.status_code == 200
    assert res_pfz.json()["type"] == "FeatureCollection"
    
    res_imbl = client.get("/api/marine/layers/imbl")
    assert res_imbl.status_code == 200
    assert res_imbl.json()["type"] == "FeatureCollection"
    
    res_mpa = client.get("/api/marine/layers/mpa")
    assert res_mpa.status_code == 200
    assert res_mpa.json()["type"] == "FeatureCollection"

def test_chat_emits_map_action():
    custom_client = TestClient(app, client=("10.0.0.99", 50000))
    payload = {
        "message": "Where are the fishing zones and wave conditions near Kochi?",
        "location": "Kochi",
        "persona": "fisher"
    }
    response = custom_client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "map_action" in data
    assert data["map_action"] is not None
    assert data["map_action"]["type"] == "flyTo"
    assert abs(data["map_action"]["lat"] - 9.93) < 0.1
    assert abs(data["map_action"]["lon"] - 76.26) < 0.1
