import random
from datetime import datetime, timedelta

def get_mock_sst(bbox=None):
    """
    Generate realistic Sea Surface Temperature points off the coast of India.
    Default bbox encompasses roughly the Arabian Sea and Bay of Bengal.
    """
    # India rough bounding box: 68.0, 6.0, 97.0, 37.0
    # Let's focus on the ocean parts (South India, Arabian Sea, Bay of Bengal)
    points = []
    base_time = datetime.utcnow()
    
    for i in range(50):
        lon = random.uniform(70.0, 90.0)
        lat = random.uniform(8.0, 20.0)
        # SST ranges typically from 26 to 31 in Indian Ocean
        temp = round(random.uniform(26.5, 30.5), 2)
        
        points.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "source": "mosdac_insat3d_mock",
                "temp_c": temp,
                "timestamp": (base_time - timedelta(hours=random.randint(0, 24))).isoformat()
            }
        })
        
    return {
        "type": "FeatureCollection",
        "features": points
    }

def get_mock_pfz(bbox=None):
    """
    Generate realistic Potential Fishing Zone polygons (OGC WFS style)
    """
    features = []
    base_time = datetime.utcnow()
    
    for i in range(15):
        lon = random.uniform(72.0, 88.0)
        lat = random.uniform(9.0, 19.0)
        # Create a small rectangular polygon to represent a zone
        polygon = [
            [lon, lat],
            [lon + 0.1, lat],
            [lon + 0.1, lat + 0.1],
            [lon, lat + 0.1],
            [lon, lat]
        ]
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [polygon]
            },
            "properties": {
                "source": "bhuvan_pfz_mock",
                "confidence_score": round(random.uniform(0.7, 0.99), 2),
                "timestamp": base_time.isoformat()
            }
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }
