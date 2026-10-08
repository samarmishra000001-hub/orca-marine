"""Coastal Locations Gazetteer extracted from mock orchestrator.
Provides coordinate lookups, maritime basins, and state mapping for 50+ Indian coastal ports and islands.
"""

COASTAL_LOCATIONS = {
    # Gujarat & North Arabian Sea
    "porbandar": {"lat": 21.64, "lon": 69.60, "name": "Porbandar", "state": "Gujarat", "basin": "Arabian Sea"},
    "veraval": {"lat": 20.90, "lon": 70.36, "name": "Veraval", "state": "Gujarat", "basin": "Arabian Sea"},
    "kandla": {"lat": 23.00, "lon": 70.21, "name": "Kandla Port", "state": "Gujarat", "basin": "Arabian Sea"},
    "okha": {"lat": 22.46, "lon": 69.07, "name": "Okha Port", "state": "Gujarat", "basin": "Arabian Sea"},
    "surat": {"lat": 21.17, "lon": 72.83, "name": "Surat / Hazira", "state": "Gujarat", "basin": "Arabian Sea"},
    "bhavnagar": {"lat": 21.76, "lon": 72.15, "name": "Bhavnagar", "state": "Gujarat", "basin": "Arabian Sea"},
    "mandvi": {"lat": 22.83, "lon": 69.35, "name": "Mandvi", "state": "Gujarat", "basin": "Arabian Sea"},
    "jafrabad": {"lat": 20.87, "lon": 71.36, "name": "Jafrabad", "state": "Gujarat", "basin": "Arabian Sea"},
    
    # Maharashtra
    "mumbai": {"lat": 18.92, "lon": 72.83, "name": "Mumbai Harbour", "state": "Maharashtra", "basin": "Arabian Sea"},
    "ratnagiri": {"lat": 16.99, "lon": 73.30, "name": "Ratnagiri", "state": "Maharashtra", "basin": "Arabian Sea"},
    "alibag": {"lat": 18.64, "lon": 72.87, "name": "Alibag Coast", "state": "Maharashtra", "basin": "Arabian Sea"},
    "malvan": {"lat": 16.06, "lon": 73.47, "name": "Malvan", "state": "Maharashtra", "basin": "Arabian Sea"},
    "dahanu": {"lat": 19.97, "lon": 72.73, "name": "Dahanu", "state": "Maharashtra", "basin": "Arabian Sea"},
    
    # Goa
    "goa": {"lat": 15.40, "lon": 73.80, "name": "Goa / Mormugao", "state": "Goa", "basin": "Arabian Sea"},
    "panaji": {"lat": 15.49, "lon": 73.82, "name": "Panaji Port", "state": "Goa", "basin": "Arabian Sea"},
    
    # Karnataka
    "karwar": {"lat": 14.81, "lon": 74.13, "name": "Karwar Naval Base", "state": "Karnataka", "basin": "Arabian Sea"},
    "mangalore": {"lat": 12.87, "lon": 74.84, "name": "New Mangalore Port", "state": "Karnataka", "basin": "Arabian Sea"},
    "malpe": {"lat": 13.35, "lon": 74.70, "name": "Malpe Harbor", "state": "Karnataka", "basin": "Arabian Sea"},
    "bhatkal": {"lat": 13.97, "lon": 74.55, "name": "Bhatkal", "state": "Karnataka", "basin": "Arabian Sea"},
    
    # Kerala
    "kochi": {"lat": 9.97, "lon": 76.28, "name": "Kochi Port", "state": "Kerala", "basin": "Arabian Sea"},
    "cochin": {"lat": 9.97, "lon": 76.28, "name": "Cochin Shipyard", "state": "Kerala", "basin": "Arabian Sea"},
    "kozhikode": {"lat": 11.25, "lon": 75.78, "name": "Kozhikode / Calicut", "state": "Kerala", "basin": "Arabian Sea"},
    "kollam": {"lat": 8.89, "lon": 76.60, "name": "Kollam / Quilon", "state": "Kerala", "basin": "Arabian Sea"},
    "vizhinjam": {"lat": 8.38, "lon": 76.99, "name": "Vizhinjam Transshipment", "state": "Kerala", "basin": "Arabian Sea"},
    "alappuzha": {"lat": 9.49, "lon": 76.33, "name": "Alappuzha", "state": "Kerala", "basin": "Arabian Sea"},
    "kannur": {"lat": 11.87, "lon": 75.37, "name": "Kannur Coast", "state": "Kerala", "basin": "Arabian Sea"},
    
    # Tamil Nadu & Gulf of Mannar
    "chennai": {"lat": 13.08, "lon": 80.27, "name": "Chennai Port", "state": "Tamil Nadu", "basin": "Bay of Bengal"},
    "rameswaram": {"lat": 9.28, "lon": 79.31, "name": "Rameswaram / Palk Bay", "state": "Tamil Nadu", "basin": "Palk Strait"},
    "kanyakumari": {"lat": 8.08, "lon": 77.55, "name": "Kanyakumari Cape", "state": "Tamil Nadu", "basin": "Indian Ocean"},
    "tuticorin": {"lat": 8.76, "lon": 78.13, "name": "V.O.C. Tuticorin Port", "state": "Tamil Nadu", "basin": "Gulf of Mannar"},
    "thoothukudi": {"lat": 8.76, "lon": 78.13, "name": "Thoothukudi Harbor", "state": "Tamil Nadu", "basin": "Gulf of Mannar"},
    "nagapattinam": {"lat": 10.76, "lon": 79.84, "name": "Nagapattinam Coast", "state": "Tamil Nadu", "basin": "Bay of Bengal"},
    "cuddalore": {"lat": 11.75, "lon": 79.77, "name": "Cuddalore Port", "state": "Tamil Nadu", "basin": "Bay of Bengal"},
    "ennore": {"lat": 13.23, "lon": 80.33, "name": "Kamarajar Port Ennore", "state": "Tamil Nadu", "basin": "Bay of Bengal"},
    
    # Andhra Pradesh
    "visakhapatnam": {"lat": 17.68, "lon": 83.21, "name": "Visakhapatnam (Vizag)", "state": "Andhra Pradesh", "basin": "Bay of Bengal"},
    "vizag": {"lat": 17.68, "lon": 83.21, "name": "Vizag Port", "state": "Andhra Pradesh", "basin": "Bay of Bengal"},
    "kakinada": {"lat": 16.98, "lon": 82.24, "name": "Kakinada Anchorage", "state": "Andhra Pradesh", "basin": "Bay of Bengal"},
    "machilipatnam": {"lat": 16.18, "lon": 81.13, "name": "Machilipatnam", "state": "Andhra Pradesh", "basin": "Bay of Bengal"},
    "krishnapatnam": {"lat": 14.25, "lon": 80.12, "name": "Krishnapatnam Port", "state": "Andhra Pradesh", "basin": "Bay of Bengal"},
    "gangavaram": {"lat": 17.62, "lon": 83.23, "name": "Gangavaram Port", "state": "Andhra Pradesh", "basin": "Bay of Bengal"},
    
    # Odisha
    "paradip": {"lat": 20.31, "lon": 86.61, "name": "Paradip Major Port", "state": "Odisha", "basin": "Bay of Bengal"},
    "puri": {"lat": 19.81, "lon": 85.83, "name": "Puri Coastal Waters", "state": "Odisha", "basin": "Bay of Bengal"},
    "gopalpur": {"lat": 19.26, "lon": 84.91, "name": "Gopalpur Port", "state": "Odisha", "basin": "Bay of Bengal"},
    "dhamra": {"lat": 20.81, "lon": 86.96, "name": "Dhamra Port", "state": "Odisha", "basin": "Bay of Bengal"},
    
    # West Bengal
    "kolkata": {"lat": 22.57, "lon": 88.36, "name": "Kolkata / Hooghly River", "state": "West Bengal", "basin": "Bay of Bengal"},
    "haldia": {"lat": 22.06, "lon": 88.06, "name": "Haldia Dock Complex", "state": "West Bengal", "basin": "Bay of Bengal"},
    "digha": {"lat": 21.63, "lon": 87.51, "name": "Digha Fishery Center", "state": "West Bengal", "basin": "Bay of Bengal"},
    "sagar": {"lat": 21.65, "lon": 88.05, "name": "Sagar Island Anchorage", "state": "West Bengal", "basin": "Bay of Bengal"},
    
    # Union Territories & Islands
    "port_blair": {"lat": 11.66, "lon": 92.74, "name": "Port Blair (Andaman)", "state": "Andaman & Nicobar", "basin": "Andaman Sea"},
    "kavaratti": {"lat": 10.57, "lon": 72.64, "name": "Kavaratti (Lakshadweep)", "state": "Lakshadweep", "basin": "Arabian Sea"},
    "daman": {"lat": 20.42, "lon": 72.83, "name": "Daman Coastal Zone", "state": "Daman and Diu", "basin": "Arabian Sea"},
    "diu": {"lat": 20.71, "lon": 70.98, "name": "Diu Port", "state": "Daman and Diu", "basin": "Arabian Sea"},
    "puducherry": {"lat": 11.94, "lon": 79.83, "name": "Puducherry Port", "state": "Puducherry", "basin": "Bay of Bengal"}
}
