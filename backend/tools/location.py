import logging
import math
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

COASTAL_LOCATIONS = {
    # Gujarat & Gulf of Kutch / Khambhat
    'porbandar': {'lat': 21.64, 'lon': 69.60, 'state': 'Gujarat', 'basin': 'Arabian Sea'},
    'veraval': {'lat': 20.90, 'lon': 70.36, 'state': 'Gujarat', 'basin': 'Arabian Sea'},
    'kandla': {'lat': 23.00, 'lon': 70.21, 'state': 'Gujarat', 'basin': 'Arabian Sea'},
    'surat': {'lat': 21.17, 'lon': 72.83, 'state': 'Gujarat', 'basin': 'Arabian Sea'},
    'diu': {'lat': 20.71, 'lon': 70.98, 'state': 'Daman and Diu', 'basin': 'Arabian Sea'},
    'daman': {'lat': 20.39, 'lon': 72.83, 'state': 'Daman and Diu', 'basin': 'Arabian Sea'},

    # Maharashtra & Konkan Coast
    'mumbai': {'lat': 18.92, 'lon': 72.82, 'state': 'Maharashtra', 'basin': 'Arabian Sea'},
    'bombay': {'lat': 18.92, 'lon': 72.82, 'state': 'Maharashtra', 'basin': 'Arabian Sea'},
    'ratnagiri': {'lat': 16.99, 'lon': 73.28, 'state': 'Maharashtra', 'basin': 'Arabian Sea'},
    'alibaug': {'lat': 18.64, 'lon': 72.87, 'state': 'Maharashtra', 'basin': 'Arabian Sea'},

    # Goa
    'goa': {'lat': 15.29, 'lon': 73.91, 'state': 'Goa', 'basin': 'Arabian Sea'},
    'panaji': {'lat': 15.49, 'lon': 73.82, 'state': 'Goa', 'basin': 'Arabian Sea'},
    'mormugao': {'lat': 15.40, 'lon': 73.80, 'state': 'Goa', 'basin': 'Arabian Sea'},

    # Karnataka
    'karwar': {'lat': 14.80, 'lon': 74.12, 'state': 'Karnataka', 'basin': 'Arabian Sea'},
    'mangalore': {'lat': 12.91, 'lon': 74.85, 'state': 'Karnataka', 'basin': 'Arabian Sea'},
    'mangaluru': {'lat': 12.91, 'lon': 74.85, 'state': 'Karnataka', 'basin': 'Arabian Sea'},
    'udupi': {'lat': 13.34, 'lon': 74.74, 'state': 'Karnataka', 'basin': 'Arabian Sea'},
    'malpe': {'lat': 13.35, 'lon': 74.70, 'state': 'Karnataka', 'basin': 'Arabian Sea'},

    # Kerala & Malabar Coast
    'kochi': {'lat': 9.93, 'lon': 76.26, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'cochin': {'lat': 9.93, 'lon': 76.26, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'kozhikode': {'lat': 11.25, 'lon': 75.78, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'calicut': {'lat': 11.25, 'lon': 75.78, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'kollam': {'lat': 8.89, 'lon': 76.61, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'alappuzha': {'lat': 9.49, 'lon': 76.33, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'alleppey': {'lat': 9.49, 'lon': 76.33, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'thiruvananthapuram': {'lat': 8.52, 'lon': 76.93, 'state': 'Kerala', 'basin': 'Arabian Sea'},
    'trivandrum': {'lat': 8.52, 'lon': 76.93, 'state': 'Kerala', 'basin': 'Arabian Sea'},

    # Tamil Nadu & Coromandel Coast / Gulf of Mannar
    'kanyakumari': {'lat': 8.08, 'lon': 77.55, 'state': 'Tamil Nadu', 'basin': 'Laccadive Sea / Gulf of Mannar'},
    'cape comorin': {'lat': 8.08, 'lon': 77.55, 'state': 'Tamil Nadu', 'basin': 'Laccadive Sea / Gulf of Mannar'},
    'tuticorin': {'lat': 8.76, 'lon': 78.13, 'state': 'Tamil Nadu', 'basin': 'Gulf of Mannar'},
    'thoothukudi': {'lat': 8.76, 'lon': 78.13, 'state': 'Tamil Nadu', 'basin': 'Gulf of Mannar'},
    'rameswaram': {'lat': 9.29, 'lon': 79.31, 'state': 'Tamil Nadu', 'basin': 'Bay of Bengal'},
    'nagapattinam': {'lat': 10.77, 'lon': 79.84, 'state': 'Tamil Nadu', 'basin': 'Bay of Bengal'},
    'cuddalore': {'lat': 11.75, 'lon': 79.77, 'state': 'Tamil Nadu', 'basin': 'Bay of Bengal'},
    'chennai': {'lat': 13.08, 'lon': 80.27, 'state': 'Tamil Nadu', 'basin': 'Bay of Bengal'},
    'madras': {'lat': 13.08, 'lon': 80.27, 'state': 'Tamil Nadu', 'basin': 'Bay of Bengal'},
    'puducherry': {'lat': 11.94, 'lon': 79.80, 'state': 'Puducherry', 'basin': 'Bay of Bengal'},
    'pondicherry': {'lat': 11.94, 'lon': 79.80, 'state': 'Puducherry', 'basin': 'Bay of Bengal'},

    # Andhra Pradesh
    'machilipatnam': {'lat': 16.18, 'lon': 81.13, 'state': 'Andhra Pradesh', 'basin': 'Bay of Bengal'},
    'kakinada': {'lat': 16.98, 'lon': 82.24, 'state': 'Andhra Pradesh', 'basin': 'Bay of Bengal'},
    'vizag': {'lat': 17.68, 'lon': 83.21, 'state': 'Andhra Pradesh', 'basin': 'Bay of Bengal'},
    'visakhapatnam': {'lat': 17.68, 'lon': 83.21, 'state': 'Andhra Pradesh', 'basin': 'Bay of Bengal'},
    'nellore': {'lat': 14.44, 'lon': 79.98, 'state': 'Andhra Pradesh', 'basin': 'Bay of Bengal'},

    # Odisha
    'puri': {'lat': 19.81, 'lon': 85.83, 'state': 'Odisha', 'basin': 'Bay of Bengal'},
    'paradip': {'lat': 20.31, 'lon': 86.61, 'state': 'Odisha', 'basin': 'Bay of Bengal'},
    'chandipur': {'lat': 21.47, 'lon': 87.01, 'state': 'Odisha', 'basin': 'Bay of Bengal'},
    'gopalpur': {'lat': 19.26, 'lon': 84.90, 'state': 'Odisha', 'basin': 'Bay of Bengal'},

    # West Bengal & Sundarbans
    'kolkata': {'lat': 22.57, 'lon': 88.36, 'state': 'West Bengal', 'basin': 'Bay of Bengal'},
    'calcutta': {'lat': 22.57, 'lon': 88.36, 'state': 'West Bengal', 'basin': 'Bay of Bengal'},
    'digha': {'lat': 21.62, 'lon': 87.50, 'state': 'West Bengal', 'basin': 'Bay of Bengal'},
    'haldia': {'lat': 22.06, 'lon': 88.06, 'state': 'West Bengal', 'basin': 'Bay of Bengal'},
    'sundarbans': {'lat': 21.80, 'lon': 88.80, 'state': 'West Bengal', 'basin': 'Bay of Bengal'},

    # Islands
    'port blair': {'lat': 11.62, 'lon': 92.72, 'state': 'Andaman and Nicobar Islands', 'basin': 'Andaman Sea / Bay of Bengal'},
    'andaman': {'lat': 11.62, 'lon': 92.72, 'state': 'Andaman and Nicobar Islands', 'basin': 'Andaman Sea / Bay of Bengal'},
    'kavaratti': {'lat': 10.56, 'lon': 72.64, 'state': 'Lakshadweep', 'basin': 'Arabian Sea'},
    'lakshadweep': {'lat': 10.56, 'lon': 72.64, 'state': 'Lakshadweep', 'basin': 'Arabian Sea'}
}

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def resolve_location(query: str) -> Optional[Dict[str, Any]]:
    """Resolve a location name to coordinates.
    Searches COASTAL_LOCATIONS by name (fuzzy match).
    Returns: {latitude, longitude, name, state, basin, source: 'gazetteer'}"""
    query_lower = query.lower().strip()
    
    # Try exact match
    if query_lower in COASTAL_LOCATIONS:
        loc = COASTAL_LOCATIONS[query_lower]
        return {
            'latitude': loc['lat'],
            'longitude': loc['lon'],
            'name': query_lower.title(),
            'state': loc['state'],
            'basin': loc['basin'],
            'source': 'gazetteer'
        }
        
    # Try substring match
    for name, loc in COASTAL_LOCATIONS.items():
        if query_lower in name or name in query_lower:
            return {
                'latitude': loc['lat'],
                'longitude': loc['lon'],
                'name': name.title(),
                'state': loc['state'],
                'basin': loc['basin'],
                'source': 'gazetteer'
            }
            
    return None

def find_nearest_port(lat: float, lon: float) -> Dict[str, Any]:
    """Find the nearest known port to given coordinates."""
    min_dist = float('inf')
    nearest = None
    nearest_name = None
    
    for name, loc in COASTAL_LOCATIONS.items():
        dist = _haversine(lat, lon, loc['lat'], loc['lon'])
        if dist < min_dist:
            min_dist = dist
            nearest = loc
            nearest_name = name
            
    if nearest and nearest_name:
        return {
            'name': nearest_name.title(),
            'distance_km': round(min_dist, 2),
            'latitude': nearest['lat'],
            'longitude': nearest['lon'],
            'state': nearest['state'],
            'basin': nearest['basin']
        }
    return {}

def get_location_context(lat: float, lon: float) -> Dict[str, Any]:
    """Get context for coordinates.
    Returns: nearest_port, distance_to_port_km, basin (Arabian Sea/Bay of Bengal),
    state, is_coastal (within 50km of coast), source."""
    nearest = find_nearest_port(lat, lon)
    
    if not nearest:
        return {
            'nearest_port': 'Unknown',
            'distance_to_port_km': None,
            'basin': 'Unknown',
            'state': 'Unknown',
            'is_coastal': False,
            'source': 'calculated'
        }
        
    distance = nearest['distance_km']
    basin = nearest['basin']
    # Heuristic for basin based on longitude if far away
    if distance > 200:
        if lon < 77:
            basin = 'Arabian Sea'
        elif lon > 79:
            basin = 'Bay of Bengal'
        else:
            basin = 'Indian Ocean'
            
    return {
        'nearest_port': nearest['name'],
        'distance_to_port_km': distance,
        'basin': basin,
        'state': nearest['state'] if distance <= 200 else 'Open Ocean',
        'is_coastal': distance <= 50,
        'source': 'calculated'
    }
